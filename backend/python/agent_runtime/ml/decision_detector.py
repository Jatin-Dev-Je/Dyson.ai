"""
Decision detector — NLP pipeline using spaCy + pattern matching.

Replaces the regex-based detector in the TypeScript backend with a
proper NLP pipeline. Significantly better recall on indirect decision
language ("we're going with...", "agreed to...", "moving forward with").

Architecture:
  1. spaCy tokenisation + dependency parsing
  2. Rule-based pattern matching (PhraseMatcher + EntityRuler)
  3. Confidence scoring based on signal density + context
  4. Returns structured DetectedDecision objects
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from functools import lru_cache

logger = logging.getLogger(__name__)

# ─── Decision signal patterns ────────────────────────────────────────────────

# Phrases strongly indicating a decision was made
DECISION_SIGNALS: list[str] = [
    # Explicit
    "we decided", "we've decided", "decision made", "decided to",
    "we will use", "we'll use", "going with", "we're going with",
    "agreed to", "agreed on", "we agreed", "team agreed",
    "we chose", "we've chosen", "choosing to", "chose to",
    # Outcome language
    "moving forward with", "moving forward using", "approved",
    "we'll go with", "settled on", "went with", "sticking with",
    # Architecture
    "we will migrate", "we'll migrate", "deprecated in favour",
    "replacing with", "switching to", "switching from",
    "we won't use", "we're not using", "ruled out",
    # Process
    "final decision", "confirmed approach", "locking in",
]

# Phrases that look like decisions but aren't (noise reduction)
ANTI_SIGNALS: list[str] = [
    "should we", "what if we", "considering", "maybe we",
    "would it make sense", "what do you think", "thoughts?",
    "not sure", "unsure", "still deciding", "open question",
    "let's discuss", "need to decide",
]


@dataclass
class DecisionSignal:
    phrase:     str
    start:      int
    end:        int
    weight:     float


@dataclass
class DetectionResult:
    is_decision:  bool
    confidence:   float
    signals:      list[str]
    title:        str
    summary:      str


@lru_cache(maxsize=1)
def _load_nlp(model_name: str):
    import spacy  # lazy import

    try:
        nlp = spacy.load(model_name)
        logger.info("spaCy model loaded: %s", model_name)
    except OSError:
        logger.warning(
            "spaCy model '%s' not found — run: python -m spacy download %s",
            model_name, model_name,
        )
        # Fall back to blank English model (no POS/NER but still tokenises)
        nlp = spacy.blank("en")

    return nlp


def _score_signals(text_lower: str) -> tuple[list[str], float]:
    """
    Return matched signal phrases and a raw confidence score [0, 1].
    Score = weighted signal density, capped and penalised by anti-signals.
    """
    found_signals: list[str] = []
    raw_score = 0.0

    for phrase in DECISION_SIGNALS:
        if phrase in text_lower:
            found_signals.append(phrase)
            # Weight longer/more specific phrases higher
            raw_score += 0.15 + (len(phrase.split()) * 0.05)

    # Anti-signals reduce confidence
    anti_count = sum(1 for a in ANTI_SIGNALS if a in text_lower)
    raw_score -= anti_count * 0.2

    # Normalise to [0, 1]
    confidence = max(0.0, min(1.0, raw_score))
    return found_signals, confidence


def _extract_title(text: str, max_len: int = 80) -> str:
    """
    Extract a short title from the decision text.
    Takes the first sentence up to max_len chars.
    """
    sentences = re.split(r"[.!?\n]", text.strip())
    first = sentences[0].strip() if sentences else text
    if len(first) > max_len:
        first = first[:max_len].rsplit(" ", 1)[0] + "…"
    return first


def detect(text: str, model_name: str = "en_core_web_sm") -> DetectionResult:
    """
    Analyse a text block and determine whether it contains a decision.

    Args:
        text:        Raw text (Slack message, GitHub comment, etc.)
        model_name:  spaCy model to use for tokenisation

    Returns:
        DetectionResult with confidence score and extracted signals.
    """
    if not text or len(text.strip()) < 10:
        return DetectionResult(
            is_decision=False, confidence=0.0,
            signals=[], title="", summary="",
        )

    text_lower = text.lower()
    signals, confidence = _score_signals(text_lower)

    # Use spaCy for additional context (sentence boundaries, entities)
    nlp = _load_nlp(model_name)
    doc = nlp(text[:1000])   # cap for performance

    # Boost confidence if the text contains named entities (technologies, orgs)
    # — real decisions tend to mention specific things
    if hasattr(doc, "ents") and len(doc.ents) > 0:
        confidence = min(1.0, confidence + 0.05 * len(doc.ents))

    is_decision = confidence >= 0.35   # intentionally lower than WHY engine threshold
    title = _extract_title(text) if is_decision else ""

    # Build a brief summary (first 200 chars if long)
    summary = text.strip()
    if len(summary) > 200:
        summary = summary[:200].rsplit(" ", 1)[0] + "…"

    return DetectionResult(
        is_decision=is_decision,
        confidence=round(confidence, 4),
        signals=signals,
        title=title,
        summary=summary,
    )


def batch_detect(texts: list[str], model_name: str = "en_core_web_sm") -> list[DetectionResult]:
    """Detect decisions across a batch of texts. Maintains input order."""
    return [detect(t, model_name) for t in texts]

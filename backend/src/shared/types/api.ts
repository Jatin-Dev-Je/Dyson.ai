export type ApiResponse<T> = {
  data: T
  meta?: ApiMeta
}

export type ApiMeta = {
  confidence?: number
  citations?: Citation[]
  cursor?: string
  total?: number
}

export type ApiError = {
  error: {
    code: string
    message: string
  }
}

export type Citation = {
  claim: string
  sourceEventId: string
  sourceUrl: string
  confidence: number
}

export type PaginatedResponse<T> = ApiResponse<T[]> & {
  meta: ApiMeta & {
    cursor: string | null
    hasMore: boolean
  }
}

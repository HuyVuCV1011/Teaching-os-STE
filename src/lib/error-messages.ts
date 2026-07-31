export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) return error.message

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  if (typeof error === 'string') return error

  return fallback
}

export function isNetworkFetchError(error: unknown): boolean {
  const message = getErrorMessage(error, '')
  return /fetch failed|failed to fetch|networkerror|enotfound/i.test(message)
}

export function getSupabaseFetchErrorMessage(
  error: unknown,
  fallback = 'Không thể tải dữ liệu.'
): string {
  if (isNetworkFetchError(error)) {
    return 'Không thể kết nối tới Supabase project hiện cấu hình. Hãy kiểm tra NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY hoặc trạng thái project Supabase.'
  }

  return getErrorMessage(error, fallback)
}

'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="container flex min-h-[70dvh] items-center justify-center py-32">
      <section className="max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-3 text-center shadow-sm">
        <div className="rounded-[1.5rem] bg-slate-50 px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Lỗi tải trang
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-slate-100 md:text-5xl">
            Có lỗi xảy ra khi hiển thị nội dung.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-500">
            Thử tải lại phần này. Nếu lỗi lặp lại, mình sẽ cần kiểm tra log server
            và request tương ứng.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-4 active:scale-[0.98]"
          >
            Tải lại
          </button>
        </div>
      </section>
    </main>
  )
}

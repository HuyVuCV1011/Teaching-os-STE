export default function Loading() {
  return (
    <main className="container min-h-[70dvh] py-32">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="rounded-[1.5rem] bg-slate-50 p-8">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-8 h-10 w-3/4 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    </main>
  )
}

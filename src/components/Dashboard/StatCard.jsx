function StatCard({ title, value, icon: Icon, color = 'indigo', subtitle }) {
  const colorClasses = {
    indigo: 'bg-indigo-500/15 text-indigo-400',
    blue: 'bg-blue-500/15 text-blue-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
    green: 'bg-green-500/15 text-green-400',
    red: 'bg-red-500/15 text-red-400',
  }

  return (
    <div className="relative rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-5 transition-colors hover:border-indigo-500/40">
      {Icon && (
        <div
          className={`absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full ${
            colorClasses[color] || colorClasses.indigo
          }`}
        >
          <Icon size={20} />
        </div>
      )}

      <p className="pr-12 text-sm font-medium text-gray-400">{title}</p>
      <p className="mt-4 text-3xl font-bold text-white">{value}</p>
      {subtitle && (
        <p className="mt-2 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  )
}

export default StatCard

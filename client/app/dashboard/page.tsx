export default function DashboardPage() {
  return (
    <div className="grid md:grid-cols-3 gap-6">

      <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
        <h3 className="text-lg font-semibold text-[#12343b]">
          Total Lands
        </h3>
        <p className="text-3xl mt-2 text-[#e1b382] font-bold">42</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
        <h3 className="text-lg font-semibold text-[#12343b]">
          Pending Approvals
        </h3>
        <p className="text-3xl mt-2 text-[#e1b382] font-bold">5</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
        <h3 className="text-lg font-semibold text-[#12343b]">
          Verified Records
        </h3>
        <p className="text-3xl mt-2 text-[#e1b382] font-bold">37</p>
      </div>

    </div>
  )
}
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

export default function HomePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterYear, setFilterYear] = useState("2567");
  const [filterType, setFilterType] = useState("all");

  // 📊 ข้อมูลจำลองสำหรับกราฟเส้น (แนวโน้มการสมัคร)
  const trendData = [
    { name: 'จ.', สมัครใหม่: 120, เข้าใช้งาน: 400 },
    { name: 'อ.', สมัครใหม่: 250, เข้าใช้งาน: 550 },
    { name: 'พ.', สมัครใหม่: 480, เข้าใช้งาน: 800 },
    { name: 'พฤ.', สมัครใหม่: 300, เข้าใช้งาน: 650 },
    { name: 'ศ.', สมัครใหม่: 150, เข้าใช้งาน: 450 },
  ];

  // 📊 ข้อมูลจำลองสำหรับกราฟวงกลม (สัดส่วน)
  const pieData = filterType === "all" 
    ? [ { name: 'ชุมนุม', value: 850 }, { name: 'เครื่องแบบ', value: 620 }, { name: 'เพื่อสังคม', value: 340 } ]
    : [ { name: 'ม.ต้น', value: 400 }, { name: 'ม.ปลาย', value: 300 } ];
  
  const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6'];

  // 📊 ข้อมูลจำลองสำหรับกราฟแท่ง (Top 5)
  const topClubsData = [
    { name: 'ดนตรีสากล', สมาชิก: 120 },
    { name: 'E-Sport', สมาชิก: 98 },
    { name: 'ถ่ายภาพ', สมาชิก: 85 },
    { name: 'Cover Dance', สมาชิก: 75 },
    { name: 'ศิลปะ', สมาชิก: 60 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 font-sans relative overflow-x-hidden text-sm">
      
      {/* 🟢 Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[60] w-72 bg-slate-900 text-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <span className="font-bold text-lg">เมนูหลัก</span>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition text-slate-300 hover:text-white">✕</button>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/" className="block px-4 py-3 bg-blue-600 rounded-xl font-bold shadow-md">🏠 หน้าแรก (Dashboard)</Link>
          <Link href="/login" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">🔑 เข้าสู่ระบบ</Link>
          <Link href="/admin" className="block px-4 py-3 hover:bg-slate-800 rounded-xl transition">⚙️ ระบบ Admin</Link>
        </nav>
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* 🔵 Header - ย้ายชื่อกิจกรรมพัฒนาผู้เรียนมาไว้ที่นี่ */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm relative z-40 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="เปิดเมนู">
            <span className="text-2xl leading-none">☰</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-xl">🏛️</div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight text-base md:text-lg">
                โรงเรียนเชียงคำวิทยาคม <span className="text-blue-600 hidden md:inline">| งานกิจกรรมพัฒนาผู้เรียน</span>
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider">Chiangkhamwittayakhom School</p>
            </div>
          </div>
        </div>
        <div>
          <Link href="/login" className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-full font-bold hover:bg-rose-600 transition shadow-md shadow-rose-500/20">
            <span>⭐</span> เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      <main className="p-4 md:p-6 space-y-6">
        
        {/* 🎛️ ส่วนหัว Dashboard & ตัวกรอง */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="font-bold text-slate-700">ตัวกรองข้อมูล:</span>
            <select 
              value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2567">ปีการศึกษา 2567</option>
              <option value="2566">ปีการศึกษา 2566</option>
            </select>
            <select 
              value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกกิจกรรม</option>
              <option value="club">กิจกรรมชุมนุม</option>
              <option value="uniform">กิจกรรมเครื่องแบบ</option>
            </select>
          </div>
          <div className="text-xs text-slate-500 text-right w-full md:w-auto">
            อัปเดตล่าสุด: วันนี้ 08:30 น.
          </div>
        </div>

        {/* 📊 แถบ Summary Cards 4 กล่อง */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 border-l-4 border-l-blue-500">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 text-2xl">👥</div>
            <div>
              <p className="text-slate-500 text-xs font-semibold">จำนวนนักเรียนทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-800">1,256 <span className="text-sm font-normal text-slate-500">คน</span></h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 text-2xl">✅</div>
            <div>
              <p className="text-slate-500 text-xs font-semibold">ลงทะเบียนสำเร็จ</p>
              <h3 className="text-2xl font-bold text-slate-800">1,084 <span className="text-sm font-normal text-slate-500">คน</span></h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 border-l-4 border-l-rose-500">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 text-2xl">⏳</div>
            <div>
              <p className="text-slate-500 text-xs font-semibold">ยังไม่ลงทะเบียน</p>
              <h3 className="text-2xl font-bold text-slate-800">172 <span className="text-sm font-normal text-slate-500">คน</span></h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 border-l-4 border-l-amber-500">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 text-2xl">🏫</div>
            <div>
              <p className="text-slate-500 text-xs font-semibold">จำนวนกิจกรรมที่เปิดรับ</p>
              <h3 className="text-2xl font-bold text-slate-800">45 <span className="text-sm font-normal text-slate-500">กิจกรรม</span></h3>
            </div>
          </div>
        </div>

        {/* 📈 กราฟหลัก (แบ่ง 2 คอลัมน์) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* กราฟเส้นแนวโน้ม (กินพื้นที่ 2 ส่วน) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <h3 className="font-bold text-slate-700 mb-4 text-base">แนวโน้มการเข้าใช้งานและการสมัคร (รายวัน)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}}/>
                  <Line type="monotone" dataKey="เข้าใช้งาน" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="สมัครใหม่" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* กราฟวงกลมสัดส่วน (กินพื้นที่ 1 ส่วน) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 text-base">สัดส่วนผู้เข้าร่วมแยกตามประเภท</h3>
            <div className="h-64 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} คน`, 'จำนวน']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* 📊 กราฟแท่งจัดอันดับ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 text-base">Top 5 กิจกรรมยอดนิยม</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClubsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{fill: '#475569', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px'}}/>
                  <Bar dataKey="สมาชิก" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {topClubsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 text-base">📌 ข่าวสารและประกาศล่าสุด</h3>
              <Link href="/login" className="text-blue-500 text-xs hover:underline">ดูทั้งหมด</Link>
            </div>
            <div className="space-y-4 mt-4">
              {[
                { type: "แจ้งเตือน", color: "text-rose-500 bg-rose-50", text: "ระบบจะปิดรับสมัครกิจกรรมชุมนุมในวันที่ 30 พ.ย. นี้", date: "2 ชม. ที่แล้ว" },
                { type: "ระบบ", color: "text-blue-500 bg-blue-50", text: "อัปเดตรายชื่อกิจกรรมเครื่องแบบ (ลูกเสือ-เนตรนารี) ครบถ้วนแล้ว", date: "1 วันที่แล้ว" },
                { type: "ข่าวสาร", color: "text-emerald-500 bg-emerald-50", text: "ยินดีต้อนรับนักเรียนชั้น ม.1 และ ม.4 เข้าสู่ระบบกิจกรรม", date: "3 วันที่แล้ว" },
              ].map((news, idx) => (
                <div key={idx} className="flex gap-3 items-start border-b border-slate-100 pb-3 last:border-0">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap mt-0.5 ${news.color}`}>{news.type}</span>
                  <div>
                    <p className="text-sm text-slate-700">{news.text}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{news.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
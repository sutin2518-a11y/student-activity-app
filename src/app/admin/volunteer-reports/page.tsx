"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function AdminVolunteerReportPage() {
  const [loading, setLoading] = useState(true);
  const [classSummaries, setClassSummaries] = useState<any[]>([]);
  const [gradeSummaries, setGradeSummaries] = useState<any[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any[]>([]);
  const [modalGrade, setModalGrade] = useState<number | null>(null);

  // 🌟 State สำหรับเก็บรายชื่อนักเรียนที่ถูกติ๊กเลือก (Multi-Select)
  const [selectedStudentCards, setSelectedStudentCards] = useState<string[]>([]);

  const [schoolStats, setSchoolStats] = useState({
    totalStudents: 0,
    passCount: 0,
    failCount: 0,
    totalMinutes: 0,
  });

  useEffect(() => {
    fetchAllVolunteerReports();
  }, []);

  const fetchAllVolunteerReports = async () => {
    setLoading(true);

    try {
      const classMap: { [key: string]: any } = {};
      for (let g = 1; g <= 6; g++) {
        for (let r = 1; r <= 12; r++) {
          const key = `ม.${g}/${r}`;
          classMap[key] = {
            classKey: key,
            gradeLevel: g,
            classroom: r,
            students: [],
            totalStudents: 0,
            passCount: 0,
            failCount: 0,
            totalMinutes: 0,
          };
        }
      }

      const gradeMap: { [key: number]: any } = {};
      for (let g = 1; g <= 6; g++) {
        gradeMap[g] = {
          grade: g,
          gradeKey: `ม.${g}`,
          totalStudents: 0,
          passCount: 0,
          failCount: 0,
          totalMinutes: 0,
        };
      }

      const [stdPage1, stdPage2, stdPage3] = await Promise.all([
        supabase
          .from("student_database")
          .select("id, student_id_card, grade_level, classroom, no, full_name, gender")
          .range(0, 999)
          .order("grade_level", { ascending: true })
          .order("classroom", { ascending: true })
          .order("no", { ascending: true }),
        supabase
          .from("student_database")
          .select("id, student_id_card, grade_level, classroom, no, full_name, gender")
          .range(1000, 1999)
          .order("grade_level", { ascending: true })
          .order("classroom", { ascending: true })
          .order("no", { ascending: true }),
        supabase
          .from("student_database")
          .select("id, student_id_card, grade_level, classroom, no, full_name, gender")
          .range(2000, 2999)
          .order("grade_level", { ascending: true })
          .order("classroom", { ascending: true })
          .order("no", { ascending: true }),
      ]);

      const stdDb = [
        ...(stdPage1.data || []),
        ...(stdPage2.data || []),
        ...(stdPage3.data || []),
      ];

      const [profPage1, profPage2, profPage3] = await Promise.all([
        supabase.from("profiles").select("id, student_id_card").range(0, 999),
        supabase.from("profiles").select("id, student_id_card").range(1000, 1999),
        supabase.from("profiles").select("id, student_id_card").range(2000, 2999),
      ]);

      const profiles = [
        ...(profPage1.data || []),
        ...(profPage2.data || []),
        ...(profPage3.data || []),
      ];

      const [recPage1, recPage2, recPage3] = await Promise.all([
        supabase
          .from("volunteer_records")
          .select("student_id, hours, minutes, status")
          .eq("status", "APPROVED")
          .range(0, 999),
        supabase
          .from("volunteer_records")
          .select("student_id, hours, minutes, status")
          .eq("status", "APPROVED")
          .range(1000, 1999),
        supabase
          .from("volunteer_records")
          .select("student_id, hours, minutes, status")
          .eq("status", "APPROVED")
          .range(2000, 2999),
      ]);

      const records = [
        ...(recPage1.data || []),
        ...(recPage2.data || []),
        ...(recPage3.data || []),
      ];

      const cardToRecordsMap: { [key: string]: any[] } = {};
      if (profiles.length > 0 && records.length > 0) {
        const profileIdToCard: { [key: string]: string } = {};
        profiles.forEach((p) => {
          if (p.id && p.student_id_card) {
            profileIdToCard[p.id] = p.student_id_card.trim();
          }
        });

        records.forEach((r) => {
          const card = profileIdToCard[r.student_id];
          if (card) {
            if (!cardToRecordsMap[card]) cardToRecordsMap[card] = [];
            cardToRecordsMap[card].push(r);
          }
        });
      }

      let totalSchoolStudents = 0;
      let totalSchoolPass = 0;
      let totalSchoolFail = 0;
      let totalSchoolMins = 0;

      if (stdDb && stdDb.length > 0) {
        stdDb.forEach((std) => {
          const cleanGrade = std.grade_level ? std.grade_level.toString().replace(/^ม\./, "").trim() : "";
          const cleanClassroom = std.classroom ? std.classroom.toString().trim() : "";
          const card = std.student_id_card ? std.student_id_card.trim() : "";

          const stdRecords = cardToRecordsMap[card] || [];
          const totalMins = stdRecords.reduce(
            (sum, r) => sum + (r.hours || 0) * 60 + (r.minutes || 0),
            0
          );

          const numGrade = Number(cleanGrade);
          const isJunior = ["1", "2", "3"].includes(cleanGrade);
          const requiredHours = isJunior ? 8 : 10;
          const isPass = totalMins >= requiredHours * 60;

          const studentObj = {
            id: std.id,
            student_id_card: card,
            full_name: std.full_name,
            no: std.no,
            gender: std.gender,
            cleanGrade,
            cleanClassroom,
            classKey: `ม.${cleanGrade}/${cleanClassroom}`,
            approvedHours: Math.floor(totalMins / 60),
            approvedMinutes: totalMins % 60,
            totalMinutes: totalMins,
            requiredHours,
            isPass,
            recordCount: stdRecords.length,
          };

          totalSchoolStudents += 1;
          if (isPass) totalSchoolPass += 1;
          else totalSchoolFail += 1;
          totalSchoolMins += totalMins;

          if (numGrade >= 1 && numGrade <= 6 && gradeMap[numGrade]) {
            gradeMap[numGrade].totalStudents += 1;
            if (isPass) gradeMap[numGrade].passCount += 1;
            else gradeMap[numGrade].failCount += 1;
            gradeMap[numGrade].totalMinutes += totalMins;
          }

          const targetKey = `ม.${cleanGrade}/${cleanClassroom}`;
          if (classMap[targetKey]) {
            classMap[targetKey].students.push(studentObj);
            classMap[targetKey].totalStudents += 1;
            if (isPass) classMap[targetKey].passCount += 1;
            else classMap[targetKey].failCount += 1;
            classMap[targetKey].totalMinutes += totalMins;
          }
        });
      }

      setSchoolStats({
        totalStudents: totalSchoolStudents,
        passCount: totalSchoolPass,
        failCount: totalSchoolFail,
        totalMinutes: totalSchoolMins,
      });

      const sortedSummaries = Object.values(classMap).sort((a: any, b: any) => {
        if (a.gradeLevel !== b.gradeLevel) return a.gradeLevel - b.gradeLevel;
        return a.classroom - b.classroom;
      });

      setClassSummaries(sortedSummaries);
      setGradeSummaries(Object.values(gradeMap));

      const activeClass = selectedClassroom || (sortedSummaries.length > 0 ? sortedSummaries[0].classKey : null);
      if (activeClass) {
        const target = sortedSummaries.find((c) => c.classKey === activeClass);
        setSelectedClassroom(activeClass);
        setStudentDetails(target ? target.students : []);
      }
    } catch (err) {
      console.error("Error fetching volunteer reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClassroom = (classKey: string) => {
    setSelectedClassroom(classKey);
    setSelectedStudentCards([]); // รีเซ็ตรายการที่เลือกเมื่อสลับห้อง
    const target = classSummaries.find((c) => c.classKey === classKey);
    if (target) {
      setStudentDetails(target.students);
    }
  };

  const handleOpenGradeModal = (gradeNum: number) => {
    setModalGrade(gradeNum);
  };

  // 🌟 ฟังก์ชันจัดการ Checkbox สลับเลือกทั้งหมด/ยกเลิกทั้งหมด
  const handleSelectAllToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allCards = studentDetails.map((s) => s.student_id_card).filter(Boolean);
      setSelectedStudentCards(allCards);
    } else {
      setSelectedStudentCards([]);
    }
  };

  // 🌟 ฟังก์ชันจัดการ Checkbox รายบุคคล
  const handleToggleStudentSelect = (card: string) => {
    if (!card) return;
    setSelectedStudentCards((prev) =>
      prev.includes(card) ? prev.filter((c) => c !== card) : [...prev, card]
    );
  };

  const getOrCreateProfileId = async (
    studentCard: string,
    fullName: string,
    gradeLevel?: string,
    classroom?: string
  ) => {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("student_id_card", studentCard)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: newProf, error } = await supabase
      .from("profiles")
      .insert([
        {
          student_id_card: studentCard,
          full_name: fullName,
          role: "student",
          grade_level: gradeLevel,
          classroom: classroom,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Error creating profile:", error.message);
      return null;
    }
    return newProf?.id;
  };

  // 🌟 ประมวลผล "ผ" รายบุคคล
  const handleForcePassStudent = async (student: any) => {
    const confirm = await Swal.fire({
      title: `ประเมินผล "ผ" (ผ่าน)?`,
      text: `ต้องการปรับผลการประเมินของ "${student.full_name}" ให้เป็นผ่านเกณฑ์ใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ให้ผ่าน (ผ)",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirm.isConfirmed) return;

    const neededMins = student.requiredHours * 60 - student.totalMinutes;
    const hoursToAdd = neededMins > 0 ? Math.ceil(neededMins / 60) : 0;

    const profileId = await getOrCreateProfileId(
      student.student_id_card,
      student.full_name,
      student.cleanGrade,
      student.cleanClassroom
    );

    if (hoursToAdd > 0 && profileId) {
      await supabase.from("volunteer_records").insert([
        {
          student_id: profileId,
          activity_name: "[Admin] ปรับเปลี่ยนผลการประเมินเป็น ผ่าน (ผ)",
          activity_date: new Date().toISOString().split("T")[0],
          hours: hoursToAdd,
          minutes: 0,
          description: "บันทึกปรับเปลี่ยนผลการประเมินโดยผู้ดูแลระบบ (Admin)",
          status: "APPROVED",
        },
      ]);
    }

    Swal.fire({
      icon: "success",
      title: "ปรับผลสำเร็จ! ✨",
      text: `ปรับผลประเมินของ ${student.full_name} เป็น ผ่าน (ผ) เรียบร้อยแล้ว`,
      confirmButtonColor: "#2563eb",
      customClass: { popup: "rounded-3xl font-sans" },
    });
    fetchAllVolunteerReports();
  };

  // 🌟 ประมวลผล "มผ" รายบุคคล
  const handleForceFailStudent = async (student: any) => {
    const confirm = await Swal.fire({
      title: `ประเมินผล "มผ" (ไม่ผ่าน)?`,
      text: `ต้องการปรับผลการประเมินของ "${student.full_name}" ให้เป็นไม่ผ่านเกณฑ์ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ให้ไม่ผ่าน (มผ)",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirm.isConfirmed) return;

    const profileId = await getOrCreateProfileId(
      student.student_id_card,
      student.full_name,
      student.cleanGrade,
      student.cleanClassroom
    );

    if (profileId) {
      await supabase
        .from("volunteer_records")
        .update({ status: "REJECTED" })
        .eq("student_id", profileId);
    }

    Swal.fire({
      icon: "success",
      title: "ปรับผลสำเร็จ!",
      text: `ปรับผลประเมินของ ${student.full_name} เป็น ไม่ผ่าน (มผ) เรียบร้อยแล้ว`,
      confirmButtonColor: "#2563eb",
      customClass: { popup: "rounded-3xl font-sans" },
    });
    fetchAllVolunteerReports();
  };

  // 🌟 ประมวลผล "ผ" เฉพาะนักเรียนที่ติ๊กเลือก (Multi-Select)
  const handleBatchPassSelected = async () => {
    if (selectedStudentCards.length === 0) return;

    const selectedStudents = studentDetails.filter((s) =>
      selectedStudentCards.includes(s.student_id_card)
    );

    const confirm = await Swal.fire({
      title: `ประเมิน "ผ" (ผ่าน) จำนวน ${selectedStudents.length} คน?`,
      text: `คุณต้องการปรับผลการประเมินของนักเรียนที่ติ๊กเลือกให้เป็นผ่านเกณฑ์ใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ให้ผ่านที่เลือก",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: `กำลังประเมินผลผ่านเกณฑ์ ${selectedStudents.length} คน...`,
      text: "ระบบกำลังบันทึกข้อมูล กรุณารอสักครู่",
      allowOutsideClick: false,
      customClass: { popup: "rounded-3xl font-sans" },
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const recordsToInsert: any[] = [];
      const today = new Date().toISOString().split("T")[0];

      for (const std of selectedStudents) {
        if (!std.isPass) {
          const neededMins = std.requiredHours * 60 - std.totalMinutes;
          const hoursToAdd = neededMins > 0 ? Math.ceil(neededMins / 60) : 0;
          const profileId = await getOrCreateProfileId(
            std.student_id_card,
            std.full_name,
            std.cleanGrade,
            std.cleanClassroom
          );

          if (profileId && hoursToAdd > 0) {
            recordsToInsert.push({
              student_id: profileId,
              activity_name: "[Admin] ปรับประเมินผ่านเกณฑ์เฉพาะกลุ่ม (ผ)",
              activity_date: today,
              hours: hoursToAdd,
              minutes: 0,
              description: "ปรับผลประเมินรายกลุ่มโดยผู้ดูแลระบบ (Admin)",
              status: "APPROVED",
            });
          }
        }
      }

      if (recordsToInsert.length > 0) {
        await supabase.from("volunteer_records").insert(recordsToInsert);
      }

      setSelectedStudentCards([]);
      Swal.fire({
        icon: "success",
        title: "ปรับผลสำเร็จ! 🎉",
        text: `ปรับผลประเมินนักเรียนที่เลือกจำนวน ${selectedStudents.length} คนเป็น ผ่าน (ผ) เรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      fetchAllVolunteerReports();
    } catch (err) {
      console.error("Error bulk passing selected:", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประเมินผล" });
    }
  };

  // 🌟 ประมวลผล "มผ" เฉพาะนักเรียนที่ติ๊กเลือก (Multi-Select)
  const handleBatchFailSelected = async () => {
    if (selectedStudentCards.length === 0) return;

    const selectedStudents = studentDetails.filter((s) =>
      selectedStudentCards.includes(s.student_id_card)
    );

    const confirm = await Swal.fire({
      title: `ประเมิน "มผ" (ไม่ผ่าน) จำนวน ${selectedStudents.length} คน?`,
      text: `คุณต้องการปรับผลการประเมินนักเรียนที่ติ๊กเลือกให้เป็นไม่ผ่านเกณฑ์ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ให้ไม่ผ่านที่เลือก",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: `กำลังปรับผลเป็นไม่ผ่าน ${selectedStudents.length} คน...`,
      text: "ระบบกำลังปรับปรุงข้อมูล กรุณารอสักครู่",
      allowOutsideClick: false,
      customClass: { popup: "rounded-3xl font-sans" },
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const profileIds: string[] = [];
      for (const std of selectedStudents) {
        const profileId = await getOrCreateProfileId(
          std.student_id_card,
          std.full_name,
          std.cleanGrade,
          std.cleanClassroom
        );
        if (profileId) profileIds.push(profileId);
      }

      if (profileIds.length > 0) {
        await supabase
          .from("volunteer_records")
          .update({ status: "REJECTED" })
          .in("student_id", profileIds);
      }

      setSelectedStudentCards([]);
      Swal.fire({
        icon: "success",
        title: "ปรับผลสำเร็จ!",
        text: `ปรับผลประเมินนักเรียนที่เลือกจำนวน ${selectedStudents.length} คนเป็น ไม่ผ่าน (มผ) เรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      fetchAllVolunteerReports();
    } catch (err) {
      console.error("Error bulk failing selected:", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประเมินผล" });
    }
  };

  // 🌟 ประมวลผล "ผ ทั้งห้อง"
  const handleBulkPassClass = async () => {
    if (studentDetails.length === 0) return;

    const confirm = await Swal.fire({
      title: `ประเมิน "ผ" (ผ่าน) ยกห้อง (${selectedClassroom})?`,
      text: `คุณต้องการปรับผลการประเมินของนักเรียนทุกคนในห้อง ${selectedClassroom} ให้เป็นผ่านเกณฑ์ใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ให้ผ่านทั้งห้อง",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: `กำลังประเมินผลผ่านเกณฑ์ห้อง ${selectedClassroom}...`,
      text: "ระบบกำลังบันทึกข้อมูล กรุณารอสักครู่",
      allowOutsideClick: false,
      customClass: { popup: "rounded-3xl font-sans" },
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const recordsToInsert: any[] = [];
      const today = new Date().toISOString().split("T")[0];

      for (const std of studentDetails) {
        if (!std.isPass) {
          const neededMins = std.requiredHours * 60 - std.totalMinutes;
          const hoursToAdd = neededMins > 0 ? Math.ceil(neededMins / 60) : 0;
          const profileId = await getOrCreateProfileId(
            std.student_id_card,
            std.full_name,
            std.cleanGrade,
            std.cleanClassroom
          );

          if (profileId && hoursToAdd > 0) {
            recordsToInsert.push({
              student_id: profileId,
              activity_name: "[Admin] ปรับประเมินผ่านเกณฑ์ยกห้อง (ผ)",
              activity_date: today,
              hours: hoursToAdd,
              minutes: 0,
              description: "ปรับผลประเมินยกห้องโดยผู้ดูแลระบบ (Admin)",
              status: "APPROVED",
            });
          }
        }
      }

      if (recordsToInsert.length > 0) {
        await supabase.from("volunteer_records").insert(recordsToInsert);
      }

      setSelectedStudentCards([]);
      Swal.fire({
        icon: "success",
        title: "ปรับผลสำเร็จ! 🎉",
        text: `ปรับผลประเมินห้อง ${selectedClassroom} เป็น ผ่าน (ผ) ยกห้องเรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      fetchAllVolunteerReports();
    } catch (err) {
      console.error("Error bulk passing:", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประเมินผล" });
    }
  };

  // 🌟 ประมวลผล "มผ ทั้งห้อง"
  const handleBulkFailClass = async () => {
    if (studentDetails.length === 0) return;

    const confirm = await Swal.fire({
      title: `ประเมิน "มผ" (ไม่ผ่าน) ยกห้อง (${selectedClassroom})?`,
      text: `คุณต้องการรีเซ็ตผลการประเมินนักเรียนทุกคนในห้อง ${selectedClassroom} เป็นไม่ผ่านเกณฑ์ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ให้ไม่ผ่านทั้งห้อง",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: `กำลังปรับผลเป็นไม่ผ่านห้อง ${selectedClassroom}...`,
      text: "ระบบกำลังปรับปรุงข้อมูล กรุณารอสักครู่",
      allowOutsideClick: false,
      customClass: { popup: "rounded-3xl font-sans" },
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const profileIds: string[] = [];
      for (const std of studentDetails) {
        const profileId = await getOrCreateProfileId(
          std.student_id_card,
          std.full_name,
          std.cleanGrade,
          std.cleanClassroom
        );
        if (profileId) profileIds.push(profileId);
      }

      if (profileIds.length > 0) {
        await supabase
          .from("volunteer_records")
          .update({ status: "REJECTED" })
          .in("student_id", profileIds);
      }

      setSelectedStudentCards([]);
      Swal.fire({
        icon: "success",
        title: "ปรับผลสำเร็จ!",
        text: `ปรับผลประเมินห้อง ${selectedClassroom} เป็น ไม่ผ่าน (มผ) เรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      fetchAllVolunteerReports();
    } catch (err) {
      console.error("Error bulk failing:", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประเมินผล" });
    }
  };

  const exportToExcelCSV = (data: any[], filename: string, headers: string[]) => {
    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    data.forEach((row) => {
      csvContent +=
        row
          .map((field: any) => `"${String(field ?? "").replace(/"/g, '""')}"`)
          .join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllClassesSummary = () => {
    const headers = [
      "ชั้น/ห้อง",
      "จำนวนนักเรียน (คน)",
      "ผ่าน (ผ)",
      "ไม่ผ่าน (มผ)",
      "ชั่วโมงสะสมรวมห้อง",
      "อัตราการผ่าน (%)",
    ];
    const rows = classSummaries.map((c) => [
      c.classKey,
      c.totalStudents,
      c.passCount,
      c.failCount,
      `${Math.floor(c.totalMinutes / 60)} ชม. ${c.totalMinutes % 60} น.`,
      c.totalStudents > 0 ? `${((c.passCount / c.totalStudents) * 100).toFixed(1)}%` : "0%",
    ]);
    exportToExcelCSV(
      rows,
      `สรุปกิจกรรมจิตอาสา_ภาพรวมทั้ง72ห้อง_${new Date().toLocaleDateString("th-TH")}`,
      headers
    );
  };

  const exportSingleClassDetails = () => {
    if (!selectedClassroom) return;
    const headers = [
      "เลขที่",
      "เลขประจำตัว",
      "ชื่อ-นามสกุล",
      "ชั้น/ห้อง",
      "ชั่วโมงสะสม",
      "นาทีสะสม",
      "เกณฑ์ขั้นต่ำ (ชม.)",
      "ผลการประเมิน",
    ];
    const rows = studentDetails.map((s) => [
      s.no || "-",
      s.student_id_card || "-",
      s.full_name,
      s.classKey,
      s.approvedHours,
      s.approvedMinutes,
      s.requiredHours,
      s.isPass ? "ผ" : "มผ",
    ]);
    exportToExcelCSV(
      rows,
      `รายงานจิตอาสา_${selectedClassroom.replace("/", "-")}_${new Date().toLocaleDateString("th-TH")}`,
      headers
    );
  };

  const maxGradeHours = Math.max(
    ...gradeSummaries.map((g) => Math.floor(g.totalMinutes / 60)),
    10
  );

  const modalRooms = classSummaries.filter((c) => c.gradeLevel === modalGrade);
  const isAllSelected =
    studentDetails.length > 0 && selectedStudentCards.length === studentDetails.length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              📊 สารสนเทศกิจกรรมจิตอาสารายห้องเรียน (Admin)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              ตรวจสอบชั่วโมงจิตอาสาสะสม จัดการผลประเมิน (ผ/มผ) ภาพรวม 6 ระดับชั้น และส่งออก Excel
            </p>
          </div>

          <button
            onClick={exportAllClassesSummary}
            disabled={classSummaries.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2 shrink-0"
          >
            <span>📥</span>
            <span>ส่งออกภาพรวมทั้ง 72 ห้อง (Excel)</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-3xl text-center text-slate-400 text-xs">
            กำลังประมวลผลข้อมูลจิตอาสาทั้งโรงเรียน...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ฝั่งซ้าย: กราฟแท่งสรุปภาพรวม 6 ระดับชั้น */}
            <div className="lg:col-span-1 space-y-4">
              
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <span>🏫</span>
                  <span>สรุปสารสนเทศภาพรวมทั้งโรงเรียน</span>
                </h2>

                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-bold">นักเรียนทั้งหมด</p>
                    <p className="text-lg font-black text-slate-800 mt-0.5">
                      {schoolStats.totalStudents.toLocaleString()} <span className="text-xs font-normal text-slate-500">คน</span>
                    </p>
                  </div>

                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-800 font-bold">เวลาสะสมรวม</p>
                    <p className="text-lg font-black text-emerald-700 mt-0.5">
                      {Math.floor(schoolStats.totalMinutes / 60).toLocaleString()} <span className="text-xs font-normal text-emerald-600">ชม.</span>
                    </p>
                  </div>

                  <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
                    <p className="text-[10px] text-blue-800 font-bold">ผ่านเกณฑ์ (ผ)</p>
                    <p className="text-lg font-black text-blue-700 mt-0.5">
                      {schoolStats.passCount.toLocaleString()} <span className="text-xs font-normal text-blue-600">คน</span>
                    </p>
                  </div>

                  <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-100">
                    <p className="text-[10px] text-rose-800 font-bold">ไม่ผ่านเกณฑ์ (มผ)</p>
                    <p className="text-lg font-black text-rose-700 mt-0.5">
                      {schoolStats.failCount.toLocaleString()} <span className="text-xs font-normal text-rose-600">คน</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>📊</span>
                    <span>สถิติจิตอาสาแยก 6 ระดับชั้น</span>
                  </h2>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                    💡 คลิกเพื่อดูทั้ง 12 ห้อง
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {gradeSummaries.map((g) => {
                    const hours = Math.floor(g.totalMinutes / 60);
                    const mins = g.totalMinutes % 60;
                    const passPercent =
                      g.totalStudents > 0
                        ? Math.round((g.passCount / g.totalStudents) * 100)
                        : 0;

                    const barWidthPercent =
                      maxGradeHours > 0
                        ? Math.max(Math.min((hours / maxGradeHours) * 100, 100), 8)
                        : 8;

                    return (
                      <div
                        key={g.grade}
                        onClick={() => handleOpenGradeModal(g.grade)}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 cursor-pointer transition-all space-y-2 group"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                              {g.gradeKey}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ({g.totalStudents} คน)
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-emerald-700">
                              {hours} ชม. {mins} น.
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              (ผ่าน {passPercent}%)
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200/80 h-3.5 rounded-full overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              g.grade <= 3 ? "bg-blue-600" : "bg-purple-600"
                            }`}
                            style={{ width: `${barWidthPercent}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                          <span>
                            เกณฑ์ขั้นต่ำ: <strong className="text-slate-700">{g.grade <= 3 ? "8" : "10"} ชม.</strong>
                          </span>
                          <span className="font-bold">
                            <span className="text-emerald-600">ผ: {g.passCount}</span> |{" "}
                            <span className="text-rose-600">มผ: {g.failCount}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* ฝั่งขวา: รายละเอียดนักเรียนในห้องที่เลือก */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b pb-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    📋 รายละเอียดนักเรียนห้อง {selectedClassroom || "-"} ({studentDetails.length} คน)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ผ่านเกณฑ์:{" "}
                    <span className="font-bold text-emerald-600">
                      {studentDetails.filter((s) => s.isPass).length} คน
                    </span>{" "}
                    | ไม่ผ่าน:{" "}
                    <span className="font-bold text-rose-600">
                      {studentDetails.filter((s) => !s.isPass).length} คน
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <select
                    value={selectedClassroom || ""}
                    onChange={(e) => handleSelectClassroom(e.target.value)}
                    className="px-3 py-1.5 border border-blue-200 rounded-xl text-xs font-bold bg-blue-50/50 text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <optgroup key={g} label={`ระดับชั้น ม.${g}`}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => {
                          const classKey = `ม.${g}/${r}`;
                          return (
                            <option key={classKey} value={classKey}>
                              🏫 ห้อง {classKey}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleBulkPassClass}
                      disabled={studentDetails.length === 0}
                      title="ปรับผลการประเมินนักเรียนทุกคนในห้องนี้เป็นผ่าน (ผ)"
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 flex items-center gap-1"
                    >
                      <span>✅</span>
                      <span>ผ ทั้งห้อง</span>
                    </button>

                    <button
                      onClick={handleBulkFailClass}
                      disabled={studentDetails.length === 0}
                      title="ปรับผลการประเมินนักเรียนทุกคนในห้องนี้เป็นไม่ผ่าน (มผ)"
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 flex items-center gap-1"
                    >
                      <span>❌</span>
                      <span>มผ ทั้งห้อง</span>
                    </button>
                  </div>

                  <button
                    onClick={exportSingleClassDetails}
                    disabled={studentDetails.length === 0}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 flex items-center gap-1"
                  >
                    <span>📥</span>
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* 🌟 แถบเครื่องมือประเมินแบบติ๊กเลือกหลายคน (Multi-Select Toolbar) */}
              {selectedStudentCards.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex flex-wrap justify-between items-center gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-lg text-xs">
                      ☑️ เลือกอยู่ {selectedStudentCards.length} คน
                    </span>
                    <span className="text-slate-500">
                      (จาก {studentDetails.length} คนในห้อง)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchPassSelected}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                    >
                      <span>✅</span>
                      <span>ให้ ผ (เลือก {selectedStudentCards.length} คน)</span>
                    </button>

                    <button
                      onClick={handleBatchFailSelected}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                    >
                      <span>❌</span>
                      <span>ให้ มผ (เลือก {selectedStudentCards.length} คน)</span>
                    </button>

                    <button
                      onClick={() => setSelectedStudentCards([])}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              {studentDetails.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">
                  ไม่พบข้อมูลนักเรียนในห้องนี้
                </p>
              ) : (
                <div className="overflow-x-auto border rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                        {/* 🌟 Checkbox เลือกทั้งหมด */}
                        <th className="p-3 border-r w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={handleSelectAllToggle}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="เลือก/ยกเลิก ทั้งหมดในห้องนี้"
                          />
                        </th>
                        <th className="p-3 border-r w-12 text-center">เลขที่</th>
                        <th className="p-3 border-r">เลขประจำตัว</th>
                        <th className="p-3 border-r">ชื่อ - สกุล</th>
                        <th className="p-3 border-r text-center">ชั่วโมงสะสม</th>
                        <th className="p-3 border-r text-center">เกณฑ์ (ชม.)</th>
                        <th className="p-3 border-r text-center">ผลการประเมิน</th>
                        <th className="p-3 text-center">จัดการผล (Admin)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {studentDetails.map((s) => {
                        const isSelected = selectedStudentCards.includes(s.student_id_card);

                        return (
                          <tr
                            key={s.id}
                            className={`transition-colors ${
                              isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                            }`}
                          >
                            {/* 🌟 Checkbox เลือกรายบุคคล */}
                            <td className="p-3 border-r text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudentSelect(s.student_id_card)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 border-r text-center text-slate-400">
                              {s.no || "-"}
                            </td>
                            <td className="p-3 border-r font-mono text-slate-600">
                              {s.student_id_card || "-"}
                            </td>
                            <td className="p-3 border-r font-bold text-slate-900">
                              {s.full_name}
                            </td>
                            <td className="p-3 border-r text-center font-bold text-emerald-700">
                              {s.approvedHours} ชม. {s.approvedMinutes} น.
                            </td>
                            <td className="p-3 border-r text-center text-slate-500">
                              {s.requiredHours} ชม.
                            </td>
                            <td className="p-3 border-r text-center">
                              <span
                                className={`px-3 py-0.5 rounded-md font-black text-xs inline-block ${
                                  s.isPass
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-rose-100 text-rose-800 border border-rose-300"
                                }`}
                              >
                                {s.isPass ? "ผ" : "มผ"}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleForcePassStudent(s)}
                                  title="ปรับประเมินเป็นผ่าน (ผ)"
                                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-300 transition-all"
                                >
                                  ✅ ผ
                                </button>
                                <button
                                  onClick={() => handleForceFailStudent(s)}
                                  title="ปรับประเมินเป็นไม่ผ่าน (มผ)"
                                  className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] rounded-lg border border-rose-300 transition-all"
                                >
                                  ❌ มผ
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* MODAL 12 ห้อง */}
        {modalGrade && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-4xl w-full space-y-4 shadow-2xl border max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <span>🏫</span>
                    <span>สรุปจิตอาสา สเกลรายห้องเรียน ชั้น ม.{modalGrade} (12 ห้อง)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    คลิกการ์ดห้องเรียนเพื่อเปลี่ยนไปดูรายชื่อนักเรียนในห้องนั้น
                  </p>
                </div>
                <button
                  onClick={() => setModalGrade(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {modalRooms.map((r) => {
                  const hours = Math.floor(r.totalMinutes / 60);
                  const mins = r.totalMinutes % 60;
                  const passPercent =
                    r.totalStudents > 0
                      ? Math.round((r.passCount / r.totalStudents) * 100)
                      : 0;

                  const isCurrentSelected = selectedClassroom === r.classKey;

                  return (
                    <div
                      key={r.classKey}
                      onClick={() => {
                        handleSelectClassroom(r.classKey);
                        setModalGrade(null);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                        isCurrentSelected
                          ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                          : "bg-slate-50 border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-slate-900 text-base">
                            {r.classKey}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            ({r.totalStudents} คน)
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${
                            r.totalStudents > 0 && passPercent === 100
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-amber-100 text-amber-800 border-amber-300"
                          }`}
                        >
                          ผ่าน {passPercent}%
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="text-slate-600">
                          สะสมรวม:{" "}
                          <strong className="text-emerald-700 font-bold">
                            {hours} ชม. {mins} น.
                          </strong>
                        </p>
                        <div className="flex justify-between items-center text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                          <span className="text-emerald-600 font-bold">
                            ผ่าน (ผ): {r.passCount} คน
                          </span>
                          <span className="text-rose-600 font-bold">
                            ไม่ผ่าน (มผ): {r.failCount} คน
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setModalGrade(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
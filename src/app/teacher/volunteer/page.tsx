"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function TeacherVolunteerApprovalPage() {
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<any[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  // แยกปัญหา Login / ไม่พบห้อง / อ่านฐานข้อมูลล้มเหลว ออกจากกัน
  const [advisorState, setAdvisorState] = useState<
    "loading" | "needs-login" | "not-assigned" | "error" | "ready"
  >("loading");
  const [advisorNotice, setAdvisorNotice] = useState("");
  const [studentSummaries, setStudentSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "SUMMARY">("PENDING");

  // State สำหรับเก็บรายชื่อนักเรียนที่ถูกติ๊กเลือก (Multi-Select)
  const [selectedStudentCards, setSelectedStudentCards] = useState<string[]>([]);

  // State บันทึกกิจกรรมยกห้อง
  const [showClassModal, setShowClassModal] = useState(false);
  const [classActName, setClassActName] = useState("");
  const [classActDate, setClassActDate] = useState("");
  const [classHours, setClassHours] = useState(1);
  const [classMinutes, setClassMinutes] = useState(0);
  const [classDesc, setClassDesc] = useState("");
  const [classDriveUrl, setClassDriveUrl] = useState("");
  const [submittingClass, setSubmittingClass] = useState(false);

  useEffect(() => {
    fetchAdvisorRecords();
  }, []);

  const fetchAdvisorRecords = async () => {
    setLoading(true);
    setAdvisorState("loading");
    setAdvisorNotice("");
    // รีเซ็ตข้อมูลเก่าป้องกันแสดงรายชื่อจากบัญชีที่เคยเข้าใช้ก่อนหน้า
    setAssignedClasses([]);
    setPendingRecords([]);
    setApprovedRecords([]);
    setStudentSummaries([]);
    setSelectedStudentCards([]);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`ตรวจสอบบัญชีไม่สำเร็จ: ${authError.message}`);
      const user = authData.user;
      if (!user) {
        setAdvisorState("needs-login");
        setAdvisorNotice("กรุณาเข้าสู่ระบบกิจกรรมด้วยบัญชีครูที่ปรึกษาก่อน (การเปิดเบราว์เซอร์ด้วยบัญชี Google อย่างเดียวไม่เท่ากับเข้าสู่ Supabase Auth)");
        return;
      }

      const userEmail = user.email?.trim().toLowerCase();
      if (!userEmail) throw new Error("บัญชี Supabase Auth นี้ไม่มีอีเมลสำหรับตรวจสอบครูที่ปรึกษา");

      // ไม่ประกอบ .or() เป็นข้อความเอง: ถ้าเงื่อนไขหนึ่งผิดจะไม่ทำให้ทั้งคำค้นล้มเหลว
      // รองรับแถวเดิมที่ teacher_id เป็น NULL และยังเชื่อมผ่าน teacher_email ได้
      const [{ data: byEmail, error: emailError }, { data: byId, error: idError }] =
        await Promise.all([
          supabase.from("classroom_advisors")
            .select("grade_level, classroom")
            .ilike("teacher_email", userEmail),
          supabase.from("classroom_advisors")
            .select("grade_level, classroom")
            .eq("teacher_id", user.id),
        ]);

      if (emailError || idError) {
        throw new Error(`ตรวจข้อมูลครูที่ปรึกษาไม่สำเร็จ: ${emailError?.message || idError?.message}`);
      }

      const foundRooms = [...(byEmail ?? []), ...(byId ?? [])];
      const seen = new Set<string>();
      const advisorMap = foundRooms.filter((room) => {
        const key = `${String(room.grade_level).replace(/^ม\./, "").trim()}/${String(room.classroom).trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (advisorMap.length === 0) {
        setAdvisorState("not-assigned");
        setAdvisorNotice("เข้าสู่ระบบแล้ว แต่ยังไม่พบห้องที่ปรึกษาของบัญชีนี้ใน classroom_advisors กรุณาตรวจความตรงกันของอีเมลในทะเบียน (รวมช่องว่างหน้า/หลัง)");
        return;
      }
      setAssignedClasses(advisorMap);

      const allStudents: any[] = [];
      for (const room of advisorMap) {
        const cleanGrade = String(room.grade_level).replace(/^ม\./, "").trim();
        const gradeVariants = [cleanGrade, `ม.${cleanGrade}`];
        const cleanClassroom = String(room.classroom).trim();

        const { data: stds, error: studentError } = await supabase
          .from("profiles")
          .select("id, full_name, student_id_card, grade_level, classroom")
          .in("grade_level", gradeVariants)
          .eq("classroom", cleanClassroom)
          .order("student_id_card", { ascending: true });
        if (studentError) throw new Error(`ดึงรายชื่อนักเรียนห้อง ม.${cleanGrade}/${cleanClassroom} ไม่สำเร็จ: ${studentError.message}`);
        if (stds) allStudents.push(...stds);
      }
      const uniqueStudents = [...new Map(allStudents.map((s) => [s.id, s])).values()];
      const studentIds = uniqueStudents.map((s) => s.id);

      if (studentIds.length === 0) {
        setAdvisorNotice("พบห้องที่ปรึกษาแล้ว แต่ยังไม่พบนักเรียนของห้องนี้ใน profiles (อาจยังไม่มีบัญชีนักเรียนในระบบ) ต้องตรวจ student_database เพิ่มเติมก่อนจัดทำรายงาน");
        setAdvisorState("ready");
        return;
      }

      const { data: records, error: recordsError } = await supabase
        .from("volunteer_records")
        .select("*, profiles!inner(full_name, grade_level, classroom, student_id_card)")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });
      if (recordsError) throw new Error(`อ่านคำขอจิตอาสาไม่สำเร็จ: ${recordsError.message}`);
      const safeRecords = records ?? [];
      setPendingRecords(safeRecords.filter((r) => r.status === "PENDING"));
      setApprovedRecords(safeRecords.filter((r) => r.status !== "PENDING"));

      const summaries = uniqueStudents.map((student) => {
        const approved = safeRecords.filter(
          (r) => r.student_id === student.id && r.status === "APPROVED"
        );
        const totalMins = approved.reduce(
          (sum, r) => sum + (r.hours || 0) * 60 + (r.minutes || 0), 0
        );
        const cleanStdGrade = String(student.grade_level ?? "").replace(/^ม\./, "").trim();
        const requiredHours = ["1", "2", "3"].includes(cleanStdGrade) ? 8 : 10;
        return {
          ...student,
          approvedHours: Math.floor(totalMins / 60),
          approvedMinutes: totalMins % 60,
          totalMinutes: totalMins,
          requiredHours,
          isPass: totalMins >= requiredHours * 60,
          recordCount: approved.length,
        };
      });
      setStudentSummaries(summaries);
      setAdvisorState("ready");
    } catch (err) {
      console.error("Failed to load teacher volunteer advisor data", err);
      setAdvisorState("error");
      setAdvisorNotice(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอ่านข้อมูลครูที่ปรึกษา");
    } finally {
      setLoading(false);
    }
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

  const handleSelectAllToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allCards = studentSummaries.map((s) => s.student_id_card).filter(Boolean);
      setSelectedStudentCards(allCards);
    } else {
      setSelectedStudentCards([]);
    }
  };

  const handleToggleStudentSelect = (card: string) => {
    if (!card) return;
    setSelectedStudentCards((prev) =>
      prev.includes(card) ? prev.filter((c) => c !== card) : [...prev, card]
    );
  };

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

    const totalMins = (student.approvedHours || 0) * 60 + (student.approvedMinutes || 0);
    const neededMins = student.requiredHours * 60 - totalMins;
    const hoursToAdd = neededMins > 0 ? Math.ceil(neededMins / 60) : 0;

    const profileId = await getOrCreateProfileId(student.student_id_card, student.full_name, student.grade_level, student.classroom);
    if (!profileId) {
      Swal.fire({ icon: "error", title: "ไม่สามารถสร้างโปรไฟล์ได้" });
      return;
    }

    if (hoursToAdd > 0) {
      await supabase.from("volunteer_records").insert([
        {
          student_id: profileId,
          activity_name: "[ครูที่ปรึกษา] ปรับเปลี่ยนผลการประเมินเป็น ผ่าน (ผ)",
          activity_date: new Date().toISOString().split("T")[0],
          hours: hoursToAdd,
          minutes: 0,
          description: "บันทึกปรับเปลี่ยนผลการประเมินโดยครูที่ปรึกษาประจำชั้น",
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
    fetchAdvisorRecords();
  };

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

    const profileId = await getOrCreateProfileId(student.student_id_card, student.full_name, student.grade_level, student.classroom);
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
    fetchAdvisorRecords();
  };

  const handleBatchPassSelected = async () => {
    if (selectedStudentCards.length === 0) return;

    const selectedStudents = studentSummaries.filter((s) =>
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
          const totalMins = (std.approvedHours || 0) * 60 + (std.approvedMinutes || 0);
          const neededMins = std.requiredHours * 60 - totalMins;
          const hoursToAdd = neededMins > 0 ? Math.ceil(neededMins / 60) : 0;
          const profileId = await getOrCreateProfileId(std.student_id_card, std.full_name, std.grade_level, std.classroom);

          if (profileId && hoursToAdd > 0) {
            recordsToInsert.push({
              student_id: profileId,
              activity_name: "[ครูที่ปรึกษา] ปรับประเมินผ่านเกณฑ์เฉพาะกลุ่ม (ผ)",
              activity_date: today,
              hours: hoursToAdd,
              minutes: 0,
              description: "ปรับผลประเมินรายกลุ่มโดยครูที่ปรึกษาประจำชั้น",
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
      fetchAdvisorRecords();
    } catch (err) {
      console.error("Error bulk passing selected:", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประเมินผล" });
    }
  };

  const handleBatchFailSelected = async () => {
    if (selectedStudentCards.length === 0) return;

    const selectedStudents = studentSummaries.filter((s) =>
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
        const profileId = await getOrCreateProfileId(std.student_id_card, std.full_name, std.grade_level, std.classroom);
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
      fetchAdvisorRecords();
    } catch (err) {
      console.error("Error bulk failing selected:", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประเมินผล" });
    }
  };

  const handleBulkPassClass = async () => {
    if (studentSummaries.length === 0) return;

    const confirm = await Swal.fire({
      title: `ประเมิน "ผ" (ผ่าน) ยกห้องประจำชั้น?`,
      text: `คุณต้องการปรับผลการประเมินของนักเรียนทุกคนในห้องที่ท่านดูแลให้เป็นผ่านเกณฑ์ใช่หรือไม่?`,
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
      title: "กำลังประเมินผลผ่านเกณฑ์ยกห้อง...",
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

      for (const std of studentSummaries) {
        if (!std.isPass) {
          const totalMins = (std.approvedHours || 0) * 60 + (std.approvedMinutes || 0);
          const neededMins = std.requiredHours * 60 - totalMins;
          const hoursToAdd = neededMins > 0 ? Math.ceil(neededMins / 60) : 0;
          const profileId = await getOrCreateProfileId(std.student_id_card, std.full_name, std.grade_level, std.classroom);

          if (profileId && hoursToAdd > 0) {
            recordsToInsert.push({
              student_id: profileId,
              activity_name: "[ครูที่ปรึกษา] ปรับประเมินผ่านเกณฑ์ยกห้อง (ผ)",
              activity_date: today,
              hours: hoursToAdd,
              minutes: 0,
              description: "ปรับผลประเมินยกห้องโดยครูที่ปรึกษาประจำชั้น",
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
        text: `ปรับผลประเมินนักเรียนประจำชั้นเป็น ผ่าน (ผ) ยกห้องเรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      fetchAdvisorRecords();
    } catch (err) {
      console.error("Error bulk passing:", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประเมินผล" });
    }
  };

  const handleBulkFailClass = async () => {
    if (studentSummaries.length === 0) return;

    const confirm = await Swal.fire({
      title: `ประเมิน "มผ" (ไม่ผ่าน) ยกห้องประจำชั้น?`,
      text: `คุณต้องการรีเซ็ตผลการประเมินนักเรียนทุกคนในห้องที่ท่านดูแลเป็นไม่ผ่านเกณฑ์ใช่หรือไม่?`,
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
      title: "กำลังปรับผลเป็นไม่ผ่านยกห้อง...",
      text: "ระบบกำลังปรับปรุงข้อมูล กรุณารอสักครู่",
      allowOutsideClick: false,
      customClass: { popup: "rounded-3xl font-sans" },
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const profileIds: string[] = [];
      for (const std of studentSummaries) {
        const profileId = await getOrCreateProfileId(std.student_id_card, std.full_name, std.grade_level, std.classroom);
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
        text: `ปรับผลประเมินนักเรียนประจำชั้นเป็น ไม่ผ่าน (มผ) เรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      fetchAdvisorRecords();
    } catch (err) {
      console.error("Error bulk failing:", err);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประเมินผล" });
    }
  };

  const handleUpdateStatus = async (
    recordId: number,
    newStatus: "APPROVED" | "REJECTED",
    studentName: string
  ) => {
    const actionText = newStatus === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ";

    const confirmResult = await Swal.fire({
      title: `ยืนยันการ${actionText}?`,
      text: `คุณต้องการ${actionText}ชั่วโมงกิจกรรมของ "${studentName}" ใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: newStatus === "APPROVED" ? "#16a34a" : "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: `ใช่, ${actionText}`,
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirmResult.isConfirmed) return;

    const { error } = await supabase
      .from("volunteer_records")
      .update({ status: newStatus })
      .eq("id", recordId);

    if (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message });
    } else {
      Swal.fire({
        icon: "success",
        title: "ทำรายการสำเร็จ! ✨",
        text: `${actionText}กิจกรรมเรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      fetchAdvisorRecords();
    }
  };

  const handleApproveAll = async () => {
    if (pendingRecords.length === 0) return;

    const confirmResult = await Swal.fire({
      title: `อนุมัติทั้งหมด (${pendingRecords.length} รายการ)?`,
      text: `คุณต้องการกดอนุมัติกิจกรรมจิตอาสาทั้งหมดที่รอการตรวจสอบใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, อนุมัติทั้งหมด",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirmResult.isConfirmed) return;

    const pendingIds = pendingRecords.map((r) => r.id);

    const { error } = await supabase
      .from("volunteer_records")
      .update({ status: "APPROVED" })
      .in("id", pendingIds);

    if (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message });
    } else {
      Swal.fire({
        icon: "success",
        title: "อนุมัติทั้งหมดเรียบร้อย! 🎉",
        text: `อนุมัติกิจกรรมจำนวน ${pendingRecords.length} รายการสำเร็จแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      fetchAdvisorRecords();
    }
  };

  const handleSaveClassActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentSummaries.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "ไม่พบนักเรียน",
        text: "ไม่พบนายชื่อนักเรียนในห้องที่รับผิดชอบ",
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      return;
    }

    setSubmittingClass(true);

    const bulkRecords = studentSummaries.map((std) => ({
      student_id: std.id,
      activity_name: classActName,
      activity_date: classActDate,
      hours: Number(classHours),
      minutes: Number(classMinutes),
      description: classDesc ? `[กิจกรรมระดับห้อง] ${classDesc}` : "[กิจกรรมระดับห้อง]",
      drive_url: classDriveUrl.trim(),
      status: "APPROVED",
    }));

    const { error } = await supabase.from("volunteer_records").insert(bulkRecords);

    if (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message });
    } else {
      Swal.fire({
        icon: "success",
        title: "บันทึกกิจกรรมยกห้องสำเร็จ! 🎉",
        text: `เพิ่มชั่วโมงกิจกรรมให้แก่นักเรียนทั้งห้องจำนวน ${studentSummaries.length} คนเรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      setShowClassModal(false);
      setClassActName("");
      setClassActDate("");
      setClassHours(1);
      setClassMinutes(0);
      setClassDesc("");
      setClassDriveUrl("");
      fetchAdvisorRecords();
    }
    setSubmittingClass(false);
  };

  const handleExportExcel = () => {
    if (studentSummaries.length === 0) return;

    const headers = [
      "เลขประจำตัว",
      "ชื่อ-นามสกุล",
      "ระดับชั้น/ห้อง",
      "ชั่วโมงสะสม",
      "นาทีสะสม",
      "เกณฑ์ขั้นต่ำ (ชม.)",
      "ผลการประเมิน",
    ];

    const rows = studentSummaries.map((s) => [
      s.student_id_card || "-",
      s.full_name,
      `ม.${s.grade_level?.toString().replace(/^ม\./, "")}/${s.classroom}`,
      s.approvedHours,
      s.approvedMinutes,
      s.requiredHours,
      s.isPass ? "ผ" : "มผ",
    ]);

    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    rows.forEach((row) => {
      csvContent +=
        row.map((field: any) => `"${String(field ?? "").replace(/"/g, '""')}"`).join(",") +
        "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const roomName = assignedClasses
      .map((ac) => `ม.${ac.grade_level.toString().replace(/^ม\./, "")}-${ac.classroom}`)
      .join("_");
    link.setAttribute(
      "download",
      `รายงานจิตอาสา_ห้อง_${roomName}_${new Date().toLocaleDateString("th-TH")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAllSelected =
    studentSummaries.length > 0 && selectedStudentCards.length === studentSummaries.length;

  // เมื่อยังไม่ยืนยันบัญชี/ห้อง จะไม่แสดงปุ่มอนุมัติหรือบันทึกยกห้อง
  if (advisorState !== "ready") {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-800 font-sans">
        <section className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-7 shadow-sm space-y-4">
          <h1 className="text-xl font-bold">ตรวจสอบกิจกรรมจิตอาสา (ครูที่ปรึกษา)</h1>
          <p className="text-sm text-slate-700" role="status">
            {advisorState === "loading" ? "กำลังตรวจสอบบัญชีและห้องที่ปรึกษา..." : advisorNotice}
          </p>
          <div className="flex flex-wrap gap-3">
            {advisorState === "needs-login" ? (
              <Link href="/login" className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold">
                เข้าสู่ระบบกิจกรรม
              </Link>
            ) : advisorState !== "loading" ? (
              <button onClick={fetchAdvisorRecords} className="px-4 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold">
                ตรวจสอบอีกครั้ง
              </button>
            ) : null}
            <Link href="/teacher" className="px-4 py-2 rounded-xl border border-slate-300 text-sm">
              กลับหน้าเมนูครู
            </Link>
          </div>
          <p className="text-xs text-amber-700">
            ยังไม่ควรบันทึกหรืออนุมัติชั่วโมงจริงจนกว่าจะตั้งค่า RLS ของตารางจิตอาสาให้ปลอดภัย
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Link href="/teacher" className="text-xs font-bold text-emerald-600 hover:underline">← กลับเมนูหลัก</Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              👨‍🏫 ตรวจสอบกิจกรรมจิตอาสา (ครูที่ปรึกษา)
            </h1>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1.5 items-center">
              <span>ห้องเรียนที่ท่านดูแล:</span>
              {assignedClasses.length > 0 ? (
                assignedClasses.map((ac, idx) => (
                  <span
                    key={idx}
                    className="font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md"
                  >
                    ม.{ac.grade_level.toString().replace(/^ม\./, "")}/{ac.classroom}
                  </span>
                ))
              ) : (
                <span className="text-amber-600 font-bold">
                  ⚠️ ยังไม่ได้ผูกห้องเรียนประจำชั้น
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowClassModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>📢</span>
              <span>บันทึกกิจกรรมยกห้อง</span>
            </button>
          </div>
        </div>

        {advisorNotice && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
            {advisorNotice}
          </div>
        )}

        {/* แถบสลับ Tab และปุ่มการทำงาน Bulk */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl flex-wrap">
            <button
              onClick={() => {
                setTab("PENDING");
                setSelectedStudentCards([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === "PENDING"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              ⏳ รออนุมัติ ({pendingRecords.length})
            </button>
            <button
              onClick={() => {
                setTab("APPROVED");
                setSelectedStudentCards([]);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === "APPROVED"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              ✅ ตรวจแล้ว ({approvedRecords.length})
            </button>
            <button
              onClick={() => setTab("SUMMARY")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === "SUMMARY"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              📊 สรุปผลประเมิน (ผ/มผ)
            </button>
          </div>

          {tab === "PENDING" && pendingRecords.length > 0 && (
            <button
              onClick={handleApproveAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>✅</span>
              <span>อนุมัติทั้งหมด ({pendingRecords.length} รายการ)</span>
            </button>
          )}
        </div>

        {/* Tab 3: ตารางสรุปผลประเมิน ผ / มผ ประจำชั้น */}
        {tab === "SUMMARY" ? (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">
                  📊 สรุปผลการประเมินกิจกรรมจิตอาสาประจำชั้น
                </h2>
                <div className="text-xs font-bold text-slate-500 flex gap-3 mt-1">
                  <span className="text-emerald-600">
                    ผ่าน (ผ): {studentSummaries.filter((s) => s.isPass).length} คน
                  </span>
                  <span className="text-rose-600">
                    ไม่ผ่าน (มผ): {studentSummaries.filter((s) => !s.isPass).length} คน
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBulkPassClass}
                  disabled={studentSummaries.length === 0}
                  title="ปรับผลการประเมินนักเรียนทุกคนในห้องประจำชั้นเป็นผ่าน (ผ)"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                >
                  <span>✅</span>
                  <span>ผ ทั้งห้อง</span>
                </button>

                <button
                  onClick={handleBulkFailClass}
                  disabled={studentSummaries.length === 0}
                  title="ปรับผลการประเมินนักเรียนทุกคนในห้องประจำชั้นเป็นไม่ผ่าน (มผ)"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
                >
                  <span>❌</span>
                  <span>มผ ทั้งห้อง</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={studentSummaries.length === 0}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>ดาวน์โหลด Excel</span>
                </button>
              </div>
            </div>

            {/* แถบเครื่องมือประเมินแบบติ๊กเลือกหลายคนสำหรับครูที่ปรึกษา */}
            {selectedStudentCards.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-lg text-xs">
                    ☑️ เลือกอยู่ {selectedStudentCards.length} คน
                  </span>
                  <span className="text-slate-500">
                    (จาก {studentSummaries.length} คนในห้อง)
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

            {loading ? (
              <p className="text-xs text-slate-400 text-center py-8">
                กำลังคำนวณผลการประเมิน...
              </p>
            ) : studentSummaries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">ไม่พบข้อมูลนักเรียน</p>
            ) : (
              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-600 font-bold">
                      <th className="p-3 border-r w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAllToggle}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="เลือก/ยกเลิก ทั้งหมดในห้องนี้"
                        />
                      </th>
                      <th className="p-3 border-r">เลขประจำตัว</th>
                      <th className="p-3 border-r">ชื่อ - สกุล</th>
                      <th className="p-3 border-r">ชั้น/ห้อง</th>
                      <th className="p-3 border-r text-center">ชั่วโมงสะสม</th>
                      <th className="p-3 border-r text-center">เกณฑ์ขั้นต่ำ</th>
                      <th className="p-3 border-r text-center">ผลการประเมิน</th>
                      <th className="p-3 text-center">จัดการผล (ครูที่ปรึกษา)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {studentSummaries.map((s) => {
                      const isSelected = selectedStudentCards.includes(s.student_id_card);

                      return (
                        <tr
                          key={s.id}
                          className={`transition-colors ${
                            isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-3 border-r text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStudentSelect(s.student_id_card)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 border-r font-mono text-slate-500">
                            {s.student_id_card || "-"}
                          </td>
                          <td className="p-3 border-r font-bold text-slate-800">
                            {s.full_name}
                          </td>
                          <td className="p-3 border-r text-slate-600">
                            ม.{s.grade_level?.toString().replace(/^ม\./, "")}/{s.classroom}
                          </td>
                          <td className="p-3 border-r text-center font-bold text-emerald-700">
                            {s.approvedHours} ชม. {s.approvedMinutes} น.
                          </td>
                          <td className="p-3 border-r text-center text-slate-500">
                            {s.requiredHours} ชม.
                          </td>
                          <td className="p-3 border-r text-center">
                            <span
                              className={`px-3 py-1 rounded-lg font-black text-xs inline-block ${
                                s.isPass
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                            >
                              {s.isPass ? "ผ (ผ่าน)" : "มผ (ไม่ผ่าน)"}
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
        ) : (
          /* Tab 1 & Tab 2 */
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            {loading ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                กำลังโหลดข้อมูลนักเรียน...
              </p>
            ) : (tab === "PENDING" ? pendingRecords : approvedRecords).length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                ไม่มีรายการในหมวดหมู่นี้
              </p>
            ) : (
              <div className="space-y-4">
                {(tab === "PENDING" ? pendingRecords : approvedRecords).map((r) => {
                  const student = r.profiles;
                  return (
                    <div
                      key={r.id}
                      className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                            {student?.full_name} (ม.
                            {student?.grade_level?.toString().replace(/^ม\./, "")}/
                            {student?.classroom})
                          </span>
                          <span className="text-xs text-slate-400">
                            เลขประจำตัว: {student?.student_id_card || "-"}
                          </span>
                        </div>

                        <p className="font-bold text-slate-900 text-base">
                          {r.activity_name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {r.description || "ไม่ได้ระบุรายละเอียด"}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span>
                            📅 วันที่ทำ: {new Date(r.activity_date).toLocaleDateString("th-TH")}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                            ⏱️ สะสม: {r.hours || 0} ชั่วโมง {r.minutes || 0} นาที
                          </span>

                          {r.drive_url && (
                            <a
                              href={r.drive_url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-0.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-xs flex items-center gap-1 shadow-sm"
                            >
                              <span>📷</span>
                              <span>เปิดดูรูปภาพ</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {r.status === "PENDING" ? (
                        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                          <button
                            onClick={() =>
                              handleUpdateStatus(r.id, "APPROVED", student?.full_name)
                            }
                            className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                          >
                            ✅ อนุมัติ
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(r.id, "REJECTED", student?.full_name)
                            }
                            className="flex-1 md:flex-none px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition-all"
                          >
                            ❌ ปฏิเสธ
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-xl shrink-0 ${
                            r.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.status === "APPROVED" ? "✅ อนุมัติแล้ว" : "❌ ไม่อนุมัติ"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL บันทึกกิจกรรมยกห้อง */}
        {showClassModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl border">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-slate-900 text-base">
                  📢 บันทึกกิจกรรมจิตอาสายกห้อง
                </h3>
                <button
                  onClick={() => setShowClassModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveClassActivity} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    ชื่อกิจกรรม / งานที่ทำร่วมกัน
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ทำความสะอาดห้องเรียนประจำวัน"
                    value={classActName}
                    onChange={(e) => setClassActName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    วันที่ทำกิจกรรม
                  </label>
                  <input
                    type="date"
                    required
                    value={classActDate}
                    onChange={(e) => setClassActDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      จำนวนชั่วโมง
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      required
                      value={classHours}
                      onChange={(e) => setClassHours(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      จำนวนนาที
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      step="5"
                      required
                      value={classMinutes}
                      onChange={(e) => setClassMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    📁 แนบลิงก์รูปภาพกิจกรรม (Google Drive)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={classDriveUrl}
                    onChange={(e) => setClassDriveUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    รายละเอียดสังเขป
                  </label>
                  <textarea
                    rows={2}
                    placeholder="รายละเอียดการดำเนินกิจกรรม..."
                    value={classDesc}
                    onChange={(e) => setClassDesc(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={submittingClass}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    {submittingClass
                      ? "กำลังบันทึกใหักับทุกคน..."
                      : `บันทึกให้ทุกคน (${studentSummaries.length} คน)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClassModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
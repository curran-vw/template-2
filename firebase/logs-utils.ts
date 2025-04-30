"use server";

import { requireAuth } from "@/firebase/auth-utils";
import { adminDb } from "../lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export interface LogRecord {
  id: string;
  createdAt: Date;
  type: "api" | "crawl" | "email";
  status: "success" | "failed" | "pending";
  details: string;
  response?: string;
  workspaceId?: string;
  agentId?: string;
}

export async function addLog({
  type,
  status,
  details,
  response,
  workspaceId,
  agentId,
  userId,
}: {
  type: "api" | "crawl" | "email";
  status: "success" | "failed" | "pending";
  details: string;
  response?: string;
  workspaceId?: string;
  agentId?: string;
  userId?: string;
}) {
  try {
    const docRef = await adminDb.collection("logs").add({
      type,
      status,
      details,
      response: response || "",
      workspaceId: workspaceId || "",
      agentId: agentId || "",
      userId: userId || "",
      createdAt: Timestamp.now(),
    });

    return { id: docRef.id };
  } catch (error) {
    console.error("Error adding log:", error);
    return { error: "Failed to add log" };
  }
}

export async function getLogs({
  page = 1,
  pageSize = 10,
}: {
  workspaceId?: string;
  agentId?: string | null;
  logType?: "api" | "crawl" | "email" | "all";
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();

  try {
    // Create base query
    let query = adminDb.collection("logs").orderBy("createdAt", "desc");

    const snapshot = await query.get();
    const totalLogs = snapshot.docs.length;

    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedDocs = snapshot.docs.slice(startIndex, startIndex + pageSize);

    const logs = paginatedDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    })) as LogRecord[];

    return {
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLogs / pageSize),
        totalLogs,
        hasNextPage: startIndex + pageSize < totalLogs,
        hasPreviousPage: page > 1,
      },
      success: "Logs retrieved successfully",
    };
  } catch (error) {
    console.error("Error getting logs:", error);
    return { error: "Failed to retrieve logs" };
  }
}

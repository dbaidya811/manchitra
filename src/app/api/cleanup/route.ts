import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST() {
  try {
    const db = await getDb();

    // Get all posts
    const posts = await db
      .collection("feed")
      .find({})
      .project({ _id: 0, id: 1, ownerEmail: 1 })
      .toArray();

    // Get all users
    const users = await db
      .collection("users")
      .find({})
      .project({ _id: 0, email: 1 })
      .toArray();

    const userEmails = new Set(users.map(u => u.email));

    // Find posts with non-existent users
    const orphanedPosts = posts.filter(post =>
      post.ownerEmail && !userEmails.has(post.ownerEmail)
    );

    if (orphanedPosts.length > 0) {
      // Remove orphaned posts
      const orphanedIds = orphanedPosts.map(p => p.id);
      const deleteResult = await db
        .collection("feed")
        .deleteMany({ id: { $in: orphanedIds } });

      console.log(`Cleaned up ${deleteResult.deletedCount} orphaned posts`);
    }

    // Clean up users without proper data
    const invalidUsers = users.filter(user =>
      !user.email ||
      !user.name ||
      !user.email.includes('@')
    );

    if (invalidUsers.length > 0) {
      const invalidEmails = invalidUsers.map(u => u.email);
      const userDeleteResult = await db
        .collection("users")
        .deleteMany({ email: { $in: invalidEmails } });

      console.log(`Cleaned up ${userDeleteResult.deletedCount} invalid users`);
    }

    return NextResponse.json({
      ok: true,
      cleaned: {
        orphanedPosts: orphanedPosts.length,
        invalidUsers: invalidUsers.length
      },
      message: `Cleaned up ${orphanedPosts.length} orphaned posts and ${invalidUsers.length} invalid users`
    });
  } catch (error) {
    console.error("Database cleanup failed", error);
    return NextResponse.json({
      ok: false,
      error: "cleanup_failed"
    }, { status: 500 });
  }
}

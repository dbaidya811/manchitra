import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

// POST /api/feed/[id]/poll
// Body: { optionIds: string[]; voter?: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const optionIds: string[] = Array.isArray(body?.optionIds) ? body.optionIds.map(String) : [];
    const voter: string | null = typeof body?.voter === 'string' && body.voter.trim() ? String(body.voter) : null;
    if (!id || optionIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    const db = await getDb();
    const post = await db.collection('feed').findOne({ id });
    if (!post || !post.poll || !Array.isArray(post.poll.options)) {
      return NextResponse.json({ ok: false, error: 'no_poll' }, { status: 404 });
    }

    const allowMultiple = !!post.poll.allowMultiple;
    // Build a map of options
    const opts = post.poll.options as Array<{ id: string; text: string; votes: number; voters?: string[] }>;
    const byId = new Map<string, any>(opts.map((o: any) => [String(o.id), { ...o, voters: Array.isArray(o.voters) ? o.voters : [] }]));

    // Determine existing selections by this voter
    const existing = voter ? opts.filter(o => Array.isArray(o.voters) && o.voters.includes(voter)) : [];
    const chosen = allowMultiple ? Array.from(new Set(optionIds)) : [optionIds[0]];

    if (allowMultiple) {
      // Toggle each chosen option: if already voted -> unvote; else vote
      for (const oid of chosen) {
        const o = byId.get(String(oid));
        if (!o) continue;
        if (voter) {
          if (o.voters.includes(voter)) {
            o.voters = o.voters.filter((v: string) => v !== voter);
            o.votes = Math.max(0, (typeof o.votes === 'number' ? o.votes : 0) - 1);
          } else {
            o.voters.push(voter);
            o.votes = (typeof o.votes === 'number' ? o.votes : 0) + 1;
          }
        }
        byId.set(String(oid), o);
      }
    } else {
      // Single choice: if clicking same option -> unvote; else move vote to new option
      const target = String(chosen[0]);
      if (!target) {
        // no-op
      } else if (voter) {
        const targetOpt = byId.get(target);
        if (targetOpt) {
          const alreadyOnTarget = targetOpt.voters.includes(voter);
          if (alreadyOnTarget) {
            // unvote
            targetOpt.voters = targetOpt.voters.filter((v: string) => v !== voter);
            targetOpt.votes = Math.max(0, (typeof targetOpt.votes === 'number' ? targetOpt.votes : 0) - 1);
            byId.set(target, targetOpt);
          } else {
            // move from previous (if any)
            for (const prev of existing) {
              const p = byId.get(String(prev.id));
              if (!p) continue;
              p.voters = p.voters.filter((v: string) => v !== voter);
              p.votes = Math.max(0, (typeof p.votes === 'number' ? p.votes : 0) - 1);
              byId.set(String(prev.id), p);
            }
            // add to target
            targetOpt.voters.push(voter);
            targetOpt.votes = (typeof targetOpt.votes === 'number' ? targetOpt.votes : 0) + 1;
            byId.set(target, targetOpt);
          }
        }
      }
    }

    // Write back
    const nextOptions = Array.from(byId.values());
    await db.collection('feed').updateOne({ id }, { $set: { 'poll.options': nextOptions, 'poll.updatedAt': new Date() } });

    const totalVotes = nextOptions.reduce((s: number, o: any) => s + (typeof o.votes === 'number' ? o.votes : 0), 0);
    return NextResponse.json({ ok: true, options: nextOptions, totalVotes, allowMultiple });
  } catch (e) {
    console.error('POST /api/feed/[id]/poll error', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

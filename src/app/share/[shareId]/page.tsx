import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharePageClient } from "./share-page-client";

interface SharePageProps {
  params: {
    shareId: string;
  };
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { shareId } = params;

  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/share/${shareId}`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      return {
        title: "Plan Not Found - ManChitra",
        description: "The shared plan could not be found or has expired."
      };
    }

    const data = await res.json();

    if (data.ok && data.plan) {
      return {
        title: `Shared Plan: ${data.plan.name} - ManChitra`,
        description: `Check out this plan: ${data.plan.description || 'A shared plan from ManChitra'}`,
        openGraph: {
          title: `Shared Plan: ${data.plan.name}`,
          description: data.plan.description || 'A shared plan from ManChitra',
          type: 'website',
        }
      };
    }
  } catch (error) {
    console.error('Error generating metadata for share page:', error);
  }

  return {
    title: "Shared Plan - ManChitra",
    description: "View and save shared plans from ManChitra."
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = params;

  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/share/${shareId}`, {
      cache: 'no-store'
    });

    if (!res.ok) {
      notFound();
    }

    const data = await res.json();

    if (!data.ok) {
      notFound();
    }

    return <SharePageClient shareId={shareId} initialPlan={data.plan} originalUserEmail={data.originalUserEmail} />;
  } catch (error) {
    console.error('Error loading share page:', error);
    notFound();
  }
}

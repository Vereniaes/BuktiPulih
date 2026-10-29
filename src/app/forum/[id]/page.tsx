// Todo:
// -> Render sample post pages and metadata, or load persisted posts on the client.

// --- Post page ---
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getForumPostById, getAllForumPostIds } from "@/data/forumPostsData";
import { ForumPostDetailClient } from "@/components/ForumPostDetailClient";
import { ForumRemotePost } from "@/components/forum/ForumRemotePost";
import { PageMotion } from "@/components/PageMotion";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Purpose: Build metadata for sample posts; persisted posts load on the client.
// Input: Route parameters.
// Output: Next.js metadata.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = getForumPostById(id);

  if (!post) {
    return /^[a-f0-9]{24}$/i.test(id) ? {
      title: "Catatan Ruang Suara Hijau",
      description: "Catatan lapangan masyarakat di Ruang Suara Hijau.",
      alternates: { canonical: `https://buktipulih.id/forum/${id}` },
    } : {
      title: "Catatan Tidak Ditemukan — BuktiPulih",
      description: "Catatan partisipasi lapangan tidak ditemukan atau telah diarsipkan.",
    };
  }

  const title = `${post.author.username} di ${post.location_name} — Ruang Suara Hijau`;
  const description = `${post.caption.slice(0, 155)}...`;
  const mediaUrl = post.media.url || "/journal/pl-kalbar-001/m6.jpg";

  return {
    title,
    description,
    alternates: {
      canonical: `https://buktipulih.id/forum/${post.id}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://buktipulih.id/forum/${post.id}`,
      siteName: "BuktiPulih — Platform Akuntabilitas Restorasi",
      images: [
        {
          url: mediaUrl,
          width: 1200,
          height: 630,
          alt: `Dokumentasi restorasi oleh ${post.author.username}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [mediaUrl],
    },
  };
}

export function generateStaticParams() {
  return getAllForumPostIds().map((id) => ({ id }));
}

export default async function ForumDetailPage({ params }: PageProps) {
  const { id } = await params;
  const post = getForumPostById(id);

  if (!post) {
    if (/^[a-f0-9]{24}$/i.test(id)) return <PageMotion key={id} className="container" style={{ paddingTop: "20px", paddingBottom: "72px" }}><ForumRemotePost key={id} id={id} /></PageMotion>;
    notFound();
  }

  const postStructuredData = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: `Catatan Pemulihan ${post.author.username} di ${post.location_name}`,
    articleBody: post.caption,
    image: [post.media.url || "https://buktipulih.id/journal/pl-kalbar-001/m6.jpg"],
    datePublished: post.created_at,
    dateModified: post.created_at,
    author: {
      "@type": "Person",
      name: post.author.username,
      address: {
        "@type": "PostalAddress",
        addressLocality: post.author.city,
      },
    },
    contentLocation: {
      "@type": "Place",
      name: post.location_name,
    },
    publisher: {
      "@type": "Organization",
      name: "BuktiPulih",
      url: "https://buktipulih.id",
    },
  };

  return (
    <PageMotion key={id} className="container" style={{ paddingTop: "20px", paddingBottom: "72px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postStructuredData) }}
      />
      <ForumPostDetailClient post={post} />
    </PageMotion>
  );
}
// --- end of Post page ---

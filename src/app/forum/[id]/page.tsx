// src/app/forum/[id]/page.tsx
// -> rute dinamis halaman penuh postingan forum pulih (/forum/[id])
//      -> optimasi seo kelas satu dengan generatemetadata & opengraph whatsapp/twitter
//      -> integrasi generatestaticparams untuk kecepatan akses statis seketika
//      -> merender komponen interaktif forumpostdetailclient

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getForumPostById, getAllForumPostIds } from "@/data/forumPostsData";
import { ForumPostDetailClient } from "@/components/ForumPostDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

// helper --------------------------------------------------------------------------
// generator metadata dinamis untuk seo mesin pencari & pratinjau tautan whatsapp
// input param : params (id postingan)
// output : Metadata Next.js
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = getForumPostById(id);

  if (!post) {
    return {
      title: "Catatan Tidak Ditemukan — BuktiPulih",
      description: "Catatan partisipasi lapangan tidak ditemukan atau telah diarsipkan.",
    };
  }

  const title = `${post.author.username} di ${post.location_name} — Forum Pulih`;
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

// function penyedia daftar id statis untuk pra-render turbopack
export function generateStaticParams() {
  return getAllForumPostIds().map((id) => ({ id }));
}
// end of helper ------------------------------------------------------------------

export default async function ForumDetailPage({ params }: PageProps) {
  const { id } = await params;
  const post = getForumPostById(id);

  if (!post) {
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
    <main className="container" style={{ paddingTop: "20px", paddingBottom: "72px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postStructuredData) }}
      />
      <ForumPostDetailClient post={post} />
    </main>
  );
}

"use client";

import { useParams } from "next/navigation";
import { ArticleEditor } from "../editor";

export default function EditArticlePage() {
  const params = useParams();
  const id = Number(params.id);
  return <ArticleEditor articleId={id} />;
}

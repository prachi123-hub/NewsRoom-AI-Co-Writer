import { useEffect, useState } from "react";
import { fetchArticles } from "./api";

export default function TestAPI() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    fetchArticles()
      .then(setArticles)
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Articles</h2>
      {articles.map((a) => (
        <p key={a.id}>{a.text}</p>
      ))}
    </div>
  );
}

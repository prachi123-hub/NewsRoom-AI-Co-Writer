import { useState, useEffect } from "react";
import "./index.css";
import "./home.css";
import Login from "./auth/Login";
import Register from "./auth/Register";
import ForgotPassword from "./auth/ForgotPassword";
import ResetPassword from "./auth/ResetPassword";
import ProtectedRoute from "./context/ProtectedRoute";

import { AuthProvider } from "./context/AuthContext";

import { Routes, Route } from "react-router-dom";
import AnalysisPage from "./AnalysisPage_pg";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import {
  analyzeArticle,
  fetchArticles,
  rewriteArticle,
  fetchArticleById,
  deleteArticle,
} from "./api";

// =======================
// BIAS HELPERS
// =======================
function getBiasLabel(score) {
  if (score >= 85) return "Highly Biased";
  if (score >= 65) return "Moderately Biased";
  return "Mostly Neutral";
}

function getBiasColor(score) {
  if (score >= 85) return "#dc2626";
  if (score >= 65) return "#f7a100";
  return "#16a34a";
}

// =======================
// MAIN EDITOR PAGE
// =======================
function MainApp({ theme, setTheme }) {
  // AUTH MODAL STATE
  const { user, logout } = useAuth();
  const username = user?.username;
  const GUEST_LIMIT = 2;
  const [guestCount, setGuestCount] = useState(
    Number(localStorage.getItem("guest_analysis_count") || 0),
  );

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  // const [theme, setTheme] = useState("light");
  const [link, setLink] = useState("");
  const [rewrittenText, setRewrittenText] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [rewriting, setRewriting] = useState(false);

  const [searchQuery, setSearchQuery] = useState(""); // search history
  const [menuOpenId, setMenuOpenId] = useState(null); // three-dot menu
  const [shareOpenId, setShareOpenId] = useState(null); // share submenu
  const [inputError, setInputError] = useState("");


  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const hasAnalysis =
    result &&
    selectedArticleId &&
    String(result.id) === String(selectedArticleId);

  const getGuestCount = () => {
    return Number(localStorage.getItem("guest_analysis_count") || 0);
  };

  const incrementGuestCount = () => {
    const next = guestCount + 1;
    localStorage.setItem("guest_analysis_count", next);
    setGuestCount(next);
  };

  function isValidArticleText(text) {
    if (!text) return false;

    // minimum word count
    const words = text.trim().split(/\s+/);
    if (words.length < 50) return false;

    // minimum sentence count
    const sentences = text
      .split(/[.!?]/)
      .filter(s => s.trim().length > 20);

    if (sentences.length < 3) return false;

    return true;
  }


  // =======================
  // FORGOT EVENT LISTENER (CORRECT)
  // =======================
  useEffect(() => {
    const openForgot = () => setShowForgot(true);
    window.addEventListener("open-forgot", openForgot);

    return () => window.removeEventListener("open-forgot", openForgot);
  }, []);
 
  useEffect(() => {
    const articleId = searchParams.get("articleId");
    if (!articleId) return;

    // 🔥 ignore frontend-only temp pages
    if (String(articleId).startsWith("new-")) return;

    fetchArticleById(articleId)
      .then((article) => {
        setSelectedArticleId(article.id);
        setText(article.content);
        setRewrittenText(article.rewritten_text || "");
        setResult(article);
      })
      .catch(() => {
        console.warn("Article not found in DB, skipping");
      });
  }, [searchParams]);


  // =======================
  // WORD COUNT
  // =======================
  const safeText = typeof text === "string" ? text : "";
  const wordCount = safeText.trim() ? safeText.trim().split(/\s+/).length : 0;
  const charCount = safeText.length;

  // =======================
  // LOAD RECENT ARTICLES
  // =======================
  useEffect(() => {
    fetchArticles().then((data) => {
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      setArticles(sorted);
    });
  }, []);

  // SELECT ARTICLE
  // =======================
  const handleSelectArticle = async (id) => {
    const article = await fetchArticleById(id);
    setSelectedArticleId(id);
    setResult(article);
    setText(article.content);
    setRewrittenText(article.rewritten_text || "");
  };

  // =======================
  // CREATE NEW PAGE
  // =======================
  const handleNewPage = () => {
    const tempId = "new-" + Date.now();

    const newArticle = {
      id: tempId,
      title: "New Page",
      content: "",
      rewritten_text: "",
      created_at: new Date().toISOString(),
      pinned: false,
    };

    setArticles([newArticle, ...articles]);
    setSelectedArticleId(tempId);
    setText("");
    setRewrittenText("");
  };

  const handleAnalyze = async () => {
    setInputError(""); // clear previous errors

    if (!user) {
      const guestCount = getGuestCount();
      if (guestCount >= GUEST_LIMIT) {
        setShowLogin(true);
        return;
      }
    }

    if (rewriting) return;

    if (!text.trim() && !link.trim()) {
      setInputError("Please paste a news article or provide a valid article link.");
      return;
    }

    if (text.trim() && !link.trim()) {
      if (!isValidArticleText(text)) {
        setInputError(
          "Please paste a real news article (at least a few paragraphs, not random words)."
        );
        return;
      }
    }

    setAnalyzing(true);

    try {
      const response = await analyzeArticle({
        text: link ? "" : text,
        link,
      });

      if (!user) incrementGuestCount();

      setText(response.content);
      setResult(response);
      setSelectedArticleId(response.id);

      fetchArticles().then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setArticles(sorted);
      });

      navigate(`/analysis/${response.id}`);
    } catch {
      setInputError("Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };


  // =======================
  // REWRITE
  // =======================
  const handleRewrite = async () => {
    if (analyzing) return;

    if (!text.trim()) {
      alert("Paste article text first");
      return;
    }

    if (!selectedArticleId) {
      alert("Analyze article first");
      return;
    }

    setRewriting(true);

    try {
      const res = await rewriteArticle({
        article_id: selectedArticleId,
        text,
      });
      setRewrittenText(res.rewritten_text);
    } catch {
      alert("Rewrite failed");
    } finally {
      setRewriting(false);
    }
  };

  // =======================
  // PIN / UNPIN ARTICLE
  // =======================
  const handlePinToggle = (articleId) => {
    setArticles((prev) =>
      prev
        .map((a) => (a.id === articleId ? { ...a, pinned: !a.pinned } : a))
        .sort((a, b) => {
          // Pinned first, then by date
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        }),
    );
  };

  // =======================
  // FILTERED ARTICLES BASED ON SEARCH
  // =======================
  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // =======================
  // MENU BUTTON STYLE
  // =======================
  const menuButtonStyle = {
    width: "100%",
    padding: "6px 10px",
    textAlign: "left",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "13px",
  };

  // =======================
  // CLOSE MENU ON OUTSIDE CLICK
  // =======================
  useEffect(() => {
    const handleClickOutside = () => {
      setMenuOpenId(null);
      setShareOpenId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div>
      {/* HEADER */}
      <header className="topbar">
        <div className="brand">
          <div className="logo">🟢</div>
          <h1>
            NewsRoom <span>AI Co-Writer</span>
          </h1>
        </div>
        <div className="top-icons">
          {!user && (
            <span
              style={{
                fontSize: "12px",
                background: guestCount >= GUEST_LIMIT ? "#fee2e2" : "#e0f2fe",
                color: guestCount >= GUEST_LIMIT ? "#991b1b" : "#0369a1",
                padding: "4px 8px",
                borderRadius: "999px",
                marginRight: "10px",
                fontWeight: "600",
              }}
            >
              Free uses: {guestCount}/{GUEST_LIMIT}
            </span>
          )}

          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          {!username ? (
            <>
              <span
                className="auth-link register"
                onClick={() => setShowRegister(true)}
              >
                REGISTER
              </span>

              <span
                className="auth-link login"
                onClick={() => setShowLogin(true)}
              >
                LOGIN 👤
              </span>
            </>
          ) : (
            <div className="user-menu">
              <span style={{ marginRight: "10px" }}>👤 {username}</span>

              <button onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="grid">
        {/* LEFT SIDEBAR */}
        <aside className="panel">
          {/* NEW PAGE BUTTON */}
          <button
            className="new-page-btn"
            onClick={handleNewPage}
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: "10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              // background: "#f9fafb",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            + New Page
          </button>

          {/* SEARCH INPUT */}
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px",
              marginBottom: "8px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
            }}
          />

          <h3 className="panel-title">Recent Articles</h3>
          <ul className="recent-list">
            {filteredArticles.length === 0 && <li>No articles found</li>}
            {filteredArticles.map((article) => (
              <li
                key={article.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  fontWeight: article.id === selectedArticleId ? "600" : "400",
                  position: "relative",
                }}
              >
                <span
                  onClick={() => handleSelectArticle(article.id)}
                  style={{
                    flex: 1,
                    marginRight: "8px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {article.pinned && (
                    <span style={{ fontSize: "14px" }}>📌</span>
                  )}
                  <span style={{ fontSize: "14px" }}>{article.title}</span>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                    {article.created_at
                      ? new Date(article.created_at).toLocaleString()
                      : ""}
                  </span>
                </span>

                {/* Three-dot menu button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(
                      menuOpenId === article.id ? null : article.id,
                    );
                    setShareOpenId(null);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    padding: "2px 6px",
                  }}
                >
                  ⋮
                </button>

                {/* Menu */}
                {menuOpenId === article.id && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: "0",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      zIndex: 10,
                      width: "120px",
                    }}
                  >
                    <button
                      style={menuButtonStyle}
                      onClick={async (e) => {
                        e.stopPropagation();

                  
                        if (String(article.id).startsWith("new-")) {
                          setArticles((prev) => prev.filter((a) => a.id !== article.id));

                          if (article.id === selectedArticleId) {
                            setSelectedArticleId(null);
                            setResult(null);
                            setText("");
                          }

                          setMenuOpenId(null);
                          return;
                        }

                    
                        await deleteArticle(article.id);

                        if (article.id === selectedArticleId) {
                          setSelectedArticleId(null);
                          setResult(null);
                          setText("");
                        }

                        fetchArticles().then(setArticles);
                        setMenuOpenId(null);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      style={menuButtonStyle}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareOpenId(shareOpenId === article.id ? null : article.id);
                      }}
                    >
                      Share
                    </button>

                    <button
                      style={menuButtonStyle}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinToggle(article.id);
                        setMenuOpenId(null);
                      }}
                    >
                      {article.pinned ? "Unpin Chat" : "Pin Chat"}
                    </button>

                    {/* Share Submenu */}
                    {shareOpenId === article.id && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: window.innerWidth - 140 - 160 > 0 ? "120px" : "0px",
                          width: "160px",
                          background: "#fff",
                          marginRight: "8px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          zIndex: 11,
                        }}
                      >
                        {[
                          { name: "System Share" },
                          { name: "Copy Link" },
                        ].map((option) => (
                          <button
                            key={option.name}
                            style={{
                              ...menuButtonStyle,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                            onClick={async (e) => {
                              e.stopPropagation();

                              const shareUrl = `${window.location.origin}/analysis/${article.id}`;

                              if (option.name === "System Share" && navigator.share) {
                                try {
                                  await navigator.share({
                                    title: "Article Analysis",
                                    text: "Check out this article analysis",
                                    url: shareUrl,
                                  });
                                } catch (err) {
                                  console.log("Share cancelled");
                                }
                              }
                          
                              else {
                                await navigator.clipboard.writeText(shareUrl);
                              }

                              setShareOpenId(null);
                              setMenuOpenId(null);
                            }}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* CENTER EDITOR */}
        <main className="editor">
          <div className="editor-header">
            <h3>Source Material</h3>
          </div>

          <div className="editor-body">
            <input
              type="text"
              placeholder="Paste news article link (optional)"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                if (inputError) setInputError(""); 
              }}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "10px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "14px",
              }}
            />
            <textarea
              placeholder="Paste or write your news article here..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (inputError) setInputError(""); 
              }}
              disabled={analyzing || rewriting}
            />
            {/*  ERROR MESSAGE — PUT IT EXACTLY HERE */}
            {inputError && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  marginTop: "10px",
                }}
              >
                ⚠️ {inputError}
              </div>
            )}

          </div>

          <div className="editor-footer">
            <div className="footer-left">
              <button className="icon-btn" onClick={() => setText("")}>
                × <span>Clear</span>
              </button>
              <button
                className="icon-btn"
                onClick={handleRewrite}
                disabled={rewriting || analyzing}
              >
                ↻ <span>{rewriting ? "Rewriting..." : "Rewrite"}</span>
              </button>
            </div>

            <span className="footer-counter">
              {wordCount} words | {charCount} chars
            </span>

            <button
              className="analyze-pill"
              disabled={analyzing || rewriting}
              onClick={() => {
                if (hasAnalysis) {
                  navigate(`/analysis/${selectedArticleId}`);
                } else {
                  handleAnalyze();
                }
              }}
            >
              ✨{" "}
              {analyzing
                ? "Analyzing..."
                : hasAnalysis
                  ? "View Report"
                  : "Analyze Article"}
            </button>
          </div>
        </main>

        {/* RIGHT PANEL */}
        <aside className="right">
          {result && (
            <>
              <div className="card highlight">
                <div className="card-header">
                  <h4>Bias Analysis</h4>
                  <span
                    className="score"
                    style={{
                      color: getBiasColor(result.bias_score),
                      fontWeight: "bold",
                    }}
                  >
                    {result.bias_score} / 100 ({getBiasLabel(result.bias_score)}
                    )
                  </span>
                </div>
                <div className="bias-scale">
                  <div className="bar">
                    <div
                      className="fill"
                      style={{
                        width: `${result.bias_score}%`,
                        backgroundColor: getBiasColor(result.bias_score),
                      }}
                    />
                  </div>
                </div>
                <p className="muted">{result.explanation}</p>
              </div>

              <div className="card">
                <h4>Neutral Summary</h4>
                <p>{result.summary}</p>
              </div>

              <div className="card">
                <h4>Perspectives</h4>
                <ul className="perspectives">
                  {result.perspectives.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {rewrittenText && (
            <div className="card">
              <h4>Neutral Rewrite</h4>
              <div className="rewrite-box">{rewrittenText}</div>
            </div>
          )}
        </aside>
      </div>
      {/* LOGIN MODAL */}
      {showLogin && <Login close={() => setShowLogin(false)} />}

      {/* REGISTER MODAL */}
      {showRegister && <Register close={() => setShowRegister(false)} />}
      {showForgot && (
        <ForgotPassword
          close={() => setShowForgot(false)}
          openReset={(username) => {
            setResetUser(username);
            setShowForgot(false);
            setShowReset(true);
          }}
        />
      )}

      {showReset && (
        <ResetPassword
          username={resetUser}
          close={() => {
            setShowReset(false);
            setResetUser(null);
          }}
        />
      )}
    </div>
  );
}

// =======================
// ROUTER
// =======================
export default function App() {
   const [theme, setTheme] = useState("light"); 
  return (
      <AuthProvider>
      <div className={`app ${theme}`}>
        <Routes>
          <Route
            path="/"
            element={<MainApp theme={theme} setTheme={setTheme} />}
          />

          <Route
            path="/analysis/:id"
            element={<AnalysisPage theme={theme} setTheme={setTheme} />}
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

<div align="center">

# Samet Birer

### Full Stack Developer · Skill & MCP Builder · Enterprise Architect

Designing systems where developers work less and deliver more — by putting LLMs where they belong.

<p>
  <a href="https://sametbrr.com">
    <img src="https://img.shields.io/badge/Website-sametbrr.com-0a66c2?style=for-the-badge&logo=google-chrome&logoColor=white">
  </a>
  <a href="https://www.linkedin.com/in/sametbrr/">
    <img src="https://img.shields.io/badge/LinkedIn-sametbrr-0a66c2?style=for-the-badge&logo=linkedin&logoColor=white">
  </a>
  <a href="https://x.com/sametbrr">
    <img src="https://img.shields.io/badge/X-sametbrr-000000?style=for-the-badge&logo=x&logoColor=white">
  </a>
  <a href="https://www.npmjs.com/~sametbrr">
    <img src="https://img.shields.io/badge/npm-sametbrr-CB3837?style=for-the-badge&logo=npm&logoColor=white">
  </a>
  <a href="https://www.nuget.org/profiles/sametbrr">
    <img src="https://img.shields.io/badge/NuGet-packages-004880?style=for-the-badge&logo=nuget&logoColor=white">
  </a>
</p>

<p>
  <a href="https://minimalblock.com">
    <img src="https://img.shields.io/badge/MinimalBlock-Blockchain%20%26%20Tech%20Blog-8A2BE2?style=for-the-badge&logo=hashnode&logoColor=white">
  </a>
</p>

![Profile Views](https://komarev.com/ghpvc/?username=sametbrr&style=for-the-badge&color=7AA2F7&label=PROFILE+VIEWS)

🌐 [Türkçe için tıklayın](README.tr.md)

</div>

---

## About Me

```txt
The best developer workflow is the one you barely have to think about.
```

Full Stack Developer with 4+ years of production experience at NarPOS — building and scaling enterprise products with .NET, Angular, and NX Monorepo architecture.

But what I'm focused on now goes beyond writing code:

* Redesigning developer workflows with LLM-native Skills and MCP servers
* Building MCP servers that give AI agents real access to production systems
* Creating Skills that automate the cognitive overhead of engineering work
* Applying enterprise architecture patterns to AI-integrated systems
* Building products at the intersection of FinTech, blockchain, and intelligent automation

I share everything I build as open source — because the best ideas compound when they're in the open.

---

## 🔨 What I Build

### LLM Tooling & MCP

Tools that make LLMs first-class citizens in developer workflows — not assistants you have to prompt carefully, but systems that act.

<table>
<thead>
<tr><th width="200">Project</th><th>What it does</th></tr>
</thead>
<tbody>
<tr>
<td><a href="https://github.com/sametbrr/llm-wiki-manager"><b>llm-wiki-manager</b></a></td>
<td>A persistent, LLM-managed personal wiki. The model writes, cross-references, and maintains the knowledge base while you curate sources. Implements <a href="https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f">Karpathy's LLM Wiki pattern</a> with 8 operating modes.</td>
</tr>
<tr>
<td><a href="https://github.com/sametbrr/prompt-architect"><b>prompt-architect</b></a></td>
<td>Turns any rough idea into a domain-classified, quality-reviewed expert prompt — 25-domain taxonomy, 8 quality gates, works in TR and EN.</td>
</tr>
<tr>
<td><a href="https://github.com/sametbrr/notebooklm"><b>notebooklm</b></a></td>
<td>Full programmatic access to Google NotebookLM from the terminal — create notebooks, add sources, generate podcasts, videos, quizzes, and more. Includes a one-time browser auth flow and multi-format downloads.</td>
</tr>
<tr>
<td><a href="https://github.com/sametbrr/readme-standard"><b>readme-standard</b></a></td>
<td>Enforces a consistent README.md + README.tr.md structure across projects — 23 rules, four modes (Create, Audit, Fix, TR Sync), and auto-detection of project type from package.json / .csproj / pyproject.toml / SKILL.md.</td>
</tr>
<tr>
<td><a href="https://github.com/sametbrr/look-again"><b>look-again</b></a></td>
<td>Saves conversation checkpoints as markdown files and resumes them with full context — decisions, rejected alternatives, and the final plan preserved verbatim. Works on Claude Code and Claude.ai.</td>
</tr>
<tr>
<td><a href="https://github.com/sametbrr/project-radar"><b>project-radar</b></a></td>
<td>Daily GitHub trending & community discovery radar — pulls the full Trending list, scans HN, Reddit, Product Hunt, YouTube and the wider web, scores each project 0–100 on usefulness, and renders a self-contained Turkish HTML report with a persistent watchlist.</td>
</tr>
<tr>
<td><a href="https://github.com/sametbrr/openapi-rest-mcp"><b>openapi-rest-mcp</b></a></td>
<td>Drop any OpenAPI/Swagger spec and get a fully functional MCP server — CRUD, endpoint discovery, fuzzy search, and multi-scheme auth out of the box.</td>
</tr>
</tbody>
</table>

### 📦 Published Packages

| Package | What it solves | Downloads |
|---------|----------------|-----------|
| [**AssemblyServiceRegistrar**](https://github.com/sametbrr/AssemblyServiceRegistrar) | Zero-boilerplate DI registration in .NET — marker interfaces and attributes, all lifetimes, open generics supported. | [![NuGet](https://img.shields.io/nuget/dt/AssemblyServiceRegistrar?label=NuGet&color=004880&logo=nuget)](https://www.nuget.org/packages/AssemblyServiceRegistrar) |
| [**EnvironmentConfigurator**](https://github.com/sametbrr/EnvironmentConfigurator) | Single-call environment-aware config loading for ASP.NET Core — publish profiles and appsettings auto-scaffolded. | [![NuGet](https://img.shields.io/nuget/dt/EnvironmentConfigurator?label=NuGet&color=004880&logo=nuget)](https://www.nuget.org/packages/EnvironmentConfigurator) |
| [**openapi-rest-mcp**](https://github.com/sametbrr/openapi-rest-mcp) | Wrap any REST API as an MCP server without writing a single tool handler. | [![npm](https://img.shields.io/npm/dt/openapi-rest-mcp?label=npm&color=CB3837&logo=npm)](https://www.npmjs.com/package/openapi-rest-mcp) |

---

## 🎯 Current Focus

**LLM-Native Developer Tooling**  
The next wave of productivity isn't faster editors or smarter autocomplete — it's LLMs that own entire workflows end to end. I'm building the infrastructure layer for that.

**Enterprise AI Integration**  
Most companies don't need a new AI product. They need their existing systems — monorepos, REST APIs, internal wikis — to become AI-accessible. MCP is the bridge. I'm building on it.

**FinTech & Blockchain**  
Actively building projects at the intersection of financial technology and blockchain — not just following the space, but experimenting and shipping.

---

## 📊 GitHub Analytics

<p align="center">
  <img src="https://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=sametbrr&theme=tokyonight" width="100%" alt="Profile Details" />
</p>

<p align="center">
  <img src="https://github-profile-summary-cards.vercel.app/api/cards/repos-per-language?username=sametbrr&theme=tokyonight" width="49%" alt="Repos Per Language" />
  <img src="https://github-profile-summary-cards.vercel.app/api/cards/most-commit-language?username=sametbrr&theme=tokyonight" width="49%" alt="Most Commit Language" />
</p>

---

## 📈 Contribution Activity

<p align="center">
  <img src="https://github-readme-activity-graph.vercel.app/graph?username=sametbrr&theme=tokyo-night&hide_border=true&area=true" alt="Activity Graph" width="100%" />
</p>

---

## Philosophy

> Automate the routine. Engineer the meaningful.

The most valuable thing a senior engineer can do isn't write better code — it's build systems that make the whole team move faster.

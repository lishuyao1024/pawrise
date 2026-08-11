# PawRise — Homepage and Architecture Speaker Notes

Your section: Slides 1–4, about 2 minutes 50 seconds. Your teammate takes over for the live demo.

## Slide 1 — PawRise

**Timing: about 20 seconds**

> Hello everyone. Our project is PawRise, a full-stack web application for pet owners. It brings pet profiles, health records, care reminders, and memories into one organized place. In my part, I will briefly explain the problem, how our homepage communicates the solution, and the high-level architecture behind it.

中文提示：一句话介绍项目，然后说明你负责 problem、homepage、architecture。

## Slide 2 — Business Challenge

**Timing: about 40 seconds**

> The main challenge is that pet-care information is often scattered. Veterinary instructions may be on paper or in a message, important medication and follow-up dates can be forgotten, and health information and memories may be stored in different places. PawRise brings these pieces together and turns them into one organized care plan. The value is not simply the website itself; it is helping owners move from scattered information to clear next steps.

中文提示：重点不是“我们做了一个网站”，而是 scattered information → organized care plan。

## Slide 3 — Homepage Strategy

**Timing: about 50 seconds**

> The homepage is designed as a guided story. The hero gives a clear promise: plan ahead, organize medical records, and keep memories. The Why PawRise section explains the real problem. The feature sections then show how the product supports care planning, medical records, and memories, and the final call to action moves the visitor into the app. One important design decision is the connection between Medical Records and Care Reminders. PawRise can extract medication and follow-up information, but the owner must review and confirm it before any reminder is created.

中文提示：按页面滚动顺序讲，不需要逐个功能念一遍。最后强调 review before confirm 是安全设计。

## Slide 4 — High-Level Architecture

**Timing: about 60 seconds**

> At a high level, the user interacts with a React and Vite frontend. The frontend communicates with a Flask REST API, and JWT protects authenticated requests. The Flask backend contains the main business areas, including accounts, pet profiles, medical records, reminders, memories, settings, and the dashboard. SQLAlchemy connects the backend to SQLite, while authenticated file storage handles images and uploaded medical records. The medical-record service can use OpenAI structured extraction when it is available, with a local fallback. In both cases, the output is only a draft until the owner reviews it.
>
> That is the high-level structure behind PawRise. Now I’ll hand it over to my teammate, who will show the live demo and the main user workflow.

中文提示：只讲数据如何流动，不要打开代码。最后一句直接交棒。

## Delivery Tips

- Keep the browser and demo data ready before the presentation begins.
- Do not read the slide word for word; use the visual as a cue.
- Pause briefly after the architecture slide, look at your teammate, and use the handoff line.
- If asked about code during Q&A, explain the relevant file or route only then.

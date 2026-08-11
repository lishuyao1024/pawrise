# PawRise Speaking Script — Homepage and Architecture

Estimated speaking time: 2.5–3 minutes.

## Part 1 — Homepage, Problem, Use, and Business Value

> First, I’ll introduce the PawRise homepage and the value of the product.
>
> PawRise is a full-stack pet-care management platform. It gives pet owners one place to manage pet profiles, medical records, care reminders, and everyday memories.
>
> The problem we are solving is that pet-care information is often scattered. Veterinary instructions may be stored on paper, in text messages, or in email. Medication and follow-up dates can be easy to forget. At the same time, health information, photos, and memories may all be kept in different places.
>
> The homepage communicates our solution in a simple order. The hero section gives the main promise: plan ahead, organize medical information, and preserve important memories. The “Why PawRise” section explains the problem. The feature sections then show how Care Planning, Medical Records, and Memories work together. Finally, the “Get started” button moves the visitor into the actual application.
>
> One of the most useful workflows is the connection between Medical Records and Care Reminders. A user can upload or paste veterinary instructions. PawRise extracts medication and follow-up information and presents it as a draft. The user reviews the information and chooses what should become a reminder. This makes the process more convenient while keeping the owner in control.
>
> From a business perspective, PawRise creates value in three ways. First, it solves a real organization problem for pet owners. Second, reminders and ongoing records give users a reason to return regularly instead of using the product only once. Third, combining health management with personal memories creates a more complete and engaging pet-care experience. The platform can also be extended in the future with mobile access, notification services, veterinary partnerships, or premium storage and care-planning features.

## Part 2 — High-Level Architecture

> Next, I’ll explain the high-level architecture behind PawRise.
>
> The frontend is built with React and Vite. React provides the user interface, including the public homepage and the authenticated application. Vite is used for development and the production build.
>
> The frontend communicates with a Flask REST API using JSON. JWT authentication protects private requests, so each user can access only their own pets, medical records, reminders, memories, settings, and dashboard information.
>
> The Flask backend is organized into separate route and business areas for authentication, pet profiles, medical records, care reminders, memories, uploads, settings, and the dashboard. This keeps the application easier to maintain and extend.
>
> SQLAlchemy connects the backend to the SQLite relational database. SQLite stores the structured application data, while authenticated file storage handles uploaded images and medical documents.
>
> The medical-record service has two extraction paths. When the OpenAI service is available, it can return structured information. If it is unavailable, PawRise uses a local fallback extractor. Both paths return a draft to the user, and reminders are created only after review and confirmation.
>
> So the overall flow is: the user interacts with React, React calls the secure Flask API, Flask applies the business rules, and SQLAlchemy stores the data in SQLite. That is the high-level structure behind PawRise.
>
> Now I’ll hand it over to my teammate, who will show the live demo and the main user workflow.

## Short Memory Cues

Homepage: **What it is → problem → homepage story → medical record workflow → business value**

Architecture: **React + Vite → Flask REST API + JWT → SQLAlchemy + SQLite/files → OpenAI or local fallback → user confirmation**

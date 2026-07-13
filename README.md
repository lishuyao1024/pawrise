# PawRise

PawRise is a pet health, care, and memory management web application. It gives pet owners one organized place to manage pet profiles, upcoming care reminders, and meaningful memories.

> **Current status:** Capstone Milestone 1 front-end prototype. The interface is functional, but it currently uses sample data stored in React state. Backend services, authentication, and persistent database storage are planned for later milestones.

## Business Problem

Pet owners often keep vaccination records, medication schedules, appointment notes, and pet photos across paper files, calendars, messaging apps, and separate photo libraries. Fragmented information makes routine care harder to coordinate and important records more difficult to find when they are needed.

PawRise addresses this problem by bringing care planning and personal pet memories into one clear, accessible interface.

## Current Features

- Home dashboard with pet summaries and the nearest care reminders
- Pet profile management for viewing, adding, editing, and removing pets
- Health and care reminder creation, editing, filtering, sorting, completion, and history
- Support for repeating care reminders
- Memory timeline with pet photos and short stories
- Care-notification and account settings interface
- Responsive layout for desktop and narrow screens
- Reusable interface components and user feedback messages

## Technology Stack

- React 19
- Vite 6
- JavaScript and JSX
- CSS
- Lucide React icons
- pnpm

## Repository Structure

```text
pawrise/
|-- frontend/    # React and Vite front-end application
|-- backend/     # Backend service planned for a later milestone
|-- docs/        # Project planning and technical documentation
|-- .gitignore
`-- README.md
```

## Run the Front End Locally

### Prerequisites

- Node.js 18 or newer
- pnpm

### Installation

```bash
cd frontend
pnpm install
pnpm dev
```

Open the local URL shown by Vite in the terminal.

To create a production build:

```bash
cd frontend
pnpm build
```

## Planned Development

- Build a backend API
- Add user registration and authentication
- Design and connect a persistent database
- Store pets, reminders, settings, and memories by user account
- Add validation, automated testing, and secure error handling
- Deploy the completed full-stack application

## Milestone 1 Scope

This repository currently demonstrates the front-end component of the PawRise capstone project. It is intended to support a solution demonstration, code walkthrough, and discussion of development issues and resolutions for the Milestone 1 submission.

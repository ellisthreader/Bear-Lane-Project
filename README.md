# Advanced Embroidery Website

A modern embroidery business website designed to give customers maximum control over product customisation while maintaining a clean, straightforward and user-friendly layout.

## 🚀 Overview

This project was built to simulate a real-world client website for an embroidery business. The focus was on creating an intuitive ordering experience where customers can personalise products easily without confusion.

The project emphasises usability, responsiveness and clean UI structure.

---

## ✨ Features

- Responsive design (mobile, tablet and desktop)
- Product customisation interface
- Clear and structured layout
- Interactive UI elements
- Clean component-based styling using Tailwind CSS
- Optimised performance and fast loading
- Easy to use admin interface

---

## 🛠 Tech Stack

- HTML5
- CSS3
- JavaScript
- Tailwind CSS
- (Optional: Node.js / Express if used)
- (Optional: MySQL if connected)

---

## 🎥 Demo

[Front Page](https://youtu.be/lqXdlYeijcA)

[Embroidery Designer](https://youtu.be/U65KJfSCV0M)

---

## 📚 What I Learned

- Structuring larger front-end projects
- Improving UI clarity and layout logic
- Managing client-style requirements
- Implementing responsive design properly
- Strengthening JavaScript problem-solving skills

---

## 🔐 Data Safety For Push/Deploy

`git push` does not include live database rows or runtime uploaded files.  
Use the included safety scripts before pushing/deploying:

1. Create a live backup:
```bash
./scripts/ops/backup-live-data.sh
```
2. Run safety checks manually:
```bash
./scripts/ops/pre-push-safety-check.sh
```
3. Install a local pre-push hook once (recommended):
```bash
./scripts/ops/install-pre-push-hook.sh
```
4. Restore on target host when needed:
```bash
./scripts/ops/restore-live-data.sh backups/<timestamp>
```

Notes:
- Backups are written to `./backups/<timestamp>/` and excluded from git.
- Runtime uploads are archived from `storage/app/public`.
- DB backup supports `sqlite`, `mysql/mariadb`, and `pgsql`.
- To intentionally allow tracked image deletions during push checks:
```bash
ALLOW_IMAGE_DELETIONS=1 ./scripts/ops/pre-push-safety-check.sh
```

---

## 📌 Author

Ellis Threader  
Essex, UK
Aspiring Software Developer

# UAT Testing Prompt for Claude Chrome

Copy-paste this prompt into Claude Chrome to run a full UAT of the Phase 22 changes.

---

## PROMPT

You are testing the Hotte Couture production management app. This is a tailoring shop SaaS used on iPad/iPhone. The app is in French.

**App URL:** https://hottecouture-v2.vercel.app (or http://localhost:3000 if testing locally)

### Authentication

The app uses a staff PIN modal on first load. Use these PINs:
- **Audrey:** `1235`
- **Solange:** `1236`
- **Audrey-Anne:** `1237`

Enter PIN `1235` when the staff PIN modal appears.

### Navigation

The app has a bottom navigation bar on mobile with 4 tabs:
- **Board** → `/board` (production kanban board)
- **Intake** → `/intake` (create new orders)
- **Clients** → `/clients`
- **Calendar** → `/calendar`

Admin pages (not in nav bar — navigate directly):
- **Pricing** → `/admin/pricing`
- **Team** → `/admin/team`

Other pages reachable from Board:
- **Workload** → `/board/workload` (from ⋮ menu on board)
- **Archived** → `/archived` (from ⋮ menu on board)

---

### TEST 1: Board Page — Scroll and French Headers

**Navigate to:** `/board`

**Expected results:**
1. Page title reads **"Tableau de Production"** (NOT "Production Board")
2. The page scrolls vertically if content overflows — try scrolling down
3. Click the ⋮ (three-dot) menu in the top-right header area
4. Menu should show **"Charge de Travail"** (NOT "Workload")
5. Menu should show **"Commandes Archivees"** (NOT "Archived Orders")
6. The blue button in the header reads **"Nouvelle Commande"** (NOT "New Order")
7. No floating chatbot button visible anywhere on the page (bottom-right corner should be clear)

**Pass criteria:** All 7 items correct. Screenshot each finding.

---

### TEST 2: Board Page — No Chatbot Widget

**While on:** `/board` (or any page)

**Expected results:**
1. There is NO floating chat bubble/button in the bottom-right corner
2. Check multiple pages (board, intake, clients) — chatbot should be hidden everywhere

**Pass criteria:** No chatbot widget visible on any page.

---

### TEST 3: Admin Pricing — Service Table with Three-Dot Menu

**Navigate to:** `/admin/pricing`

**Expected results:**
1. Below the import section and instructions, there is a **"Services"** card with subtitle **"Gerer les services et les prix"**
2. If services exist, they appear in a table with columns: **Nom, Categorie, Prix, Minutes**
3. Each row has a ⋮ (three-dot) button on the right
4. Clicking ⋮ opens a dropdown menu with three options:
   - **Modifier** (with edit icon)
   - **Exporter** (with download icon)
   - **Supprimer** (in red, with trash icon)
5. Click **Modifier** on any service → the row switches to inline edit mode with input fields and OK/X buttons
6. Click **X** to cancel editing → row returns to normal display
7. Click **Exporter** on any service → a CSV file downloads with the service data
8. If no services exist, the table shows: **"Aucun service trouve. Importez des donnees ci-dessus."**

**If no services exist:** Click "Import Sample Data" first to populate the table, then re-test items 2-7.

**Pass criteria:** Table displays, all 3 menu actions work. Screenshot the table and the open dropdown menu.

---

### TEST 4: Intake Flow — Custom Garment Type Creation

**Navigate to:** `/intake`

**Steps to reach the garment type dropdown:**
1. On the Client step, fill in:
   - Name: `Test Client`
   - Phone: `5141234567`
   - Email: `test@test.com`
   - Click **Suivant** (Next)
2. On the Pipeline step, select **Alteration** (or **Retouche**)
   - Click **Suivant**
3. You are now on the **Garment-Services** step
4. Click the **"Choisir un type de vetement..."** dropdown

**Expected results:**
1. At the bottom of the dropdown (below all garment type categories), there is a divider line
2. Below the divider, a button reads: **"+ Ajouter un type personnalise..."** in blue/primary color
3. Click the button → an inline form appears with:
   - Text input with placeholder **"Nom du type personnalise..."**
   - Category dropdown with options: Autre, Maison, Exterieur, Femmes, Hommes, Manteaux, Formel, Sport
   - Two buttons: **Annuler** (cancel, grey) and **Creer** (create, blue/primary)
4. Type a name like `Nappe de table` and select category `Maison`
5. Click **Creer** → the form closes, the dropdown refreshes, and the new type is auto-selected
6. The garment type field now shows the newly created type

**Pass criteria:** Custom type form appears, creation works, new type auto-selects. Screenshot the open form and the selected result.

---

### TEST 5: Intake Flow — Custom Type Limit (10 max)

**This is hard to test without 10 custom types already existing.** Visual check only:
1. If fewer than 10 custom types exist, the "Ajouter un type personnalise..." button should be enabled (clickable)
2. If 10 custom types exist, the button should be disabled/greyed out with text **(Limite atteinte)** next to it

**Pass criteria:** Button shows appropriate enabled/disabled state.

---

### TEST 6: Mobile Responsiveness Check

**Resize browser to mobile width (375px)** or use device emulation.

**Check on `/board`:**
1. Header doesn't overflow or clip
2. Page scrolls vertically
3. Bottom navigation bar is visible with 4 tabs
4. No chatbot widget overlapping the bottom nav

**Check on `/admin/pricing`:**
1. Service table scrolls horizontally if needed (overflow-x-auto)
2. Three-dot menu still accessible and functional

**Check on `/intake` (garment-services step):**
1. Custom type button and form fit within the dropdown
2. All buttons have 44px minimum touch target height
3. Form elements are usable with touch

**Pass criteria:** No layout breaks on mobile. All touch targets accessible.

---

### SUMMARY CHECKLIST

| # | Test | Status |
|---|------|--------|
| 1 | Board French headers (4 strings) | |
| 2 | Board vertical scroll works | |
| 3 | No chatbot widget anywhere | |
| 4 | Pricing service table displays | |
| 5 | Pricing 3-dot menu (Modifier/Exporter/Supprimer) | |
| 6 | Pricing inline edit works | |
| 7 | Pricing CSV export works | |
| 8 | Custom garment type form appears | |
| 9 | Custom garment type creation works | |
| 10 | Custom type auto-selects after creation | |
| 11 | Mobile layout — no breaks | |
| 12 | Touch targets — 44px minimum | |

Take a screenshot after each test and fill in the checklist with PASS or FAIL.

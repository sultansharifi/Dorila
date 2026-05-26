# ChocoDistro

A simple business management app for your Turkish chocolate distribution business.
Tracks shops, orders, payments, and profit — all saved in the browser automatically.

---

## How to put it on GitHub Pages (step by step)

### Step 1 — Create a GitHub account
Go to https://github.com and sign up (free).

### Step 2 — Create a new repository
1. Click the **+** button (top right) → "New repository"
2. Name it: `choco-distro`
3. Set it to **Public**
4. Click **Create repository**

### Step 3 — Upload the files
1. On your new repo page, click **"uploading an existing file"**
2. Drag and drop all 3 files:
   - `index.html`
   - `style.css`
   - `app.js`
3. Click **Commit changes**

### Step 4 — Turn on GitHub Pages
1. Go to your repo **Settings** tab
2. Click **Pages** (left sidebar)
3. Under "Branch", select `main` → click **Save**
4. Wait 1 minute, then your app is live at:
   `https://YOUR-USERNAME.github.io/choco-distro`

---

## File structure

```
choco-distro/
  index.html   ← the layout (what you see)
  style.css    ← all the colors and design
  app.js       ← all the logic and data
```

---

## How to modify the app

### Change the app name
Open `index.html`, find this line and change "ChocoDistro":
```html
<div class="logo">
  <div class="logo-dot"></div>
  ChocoDistro        ← change this
</div>
```
Also change the page title at the top:
```html
<title>ChocoDistro</title>   ← change this
```

---

### Change colors
Open `style.css`. At the very top you will see the `:root` block.
These are the main colors — change any of them:

```css
:root {
  --green:   #1D9E75;   /* main button color */
  --green2:  #0F6E56;   /* darker green (hover) */
  --bg:      #f5f5f3;   /* page background */
  --bg2:     #efefec;   /* card inner background */
  --white:   #ffffff;   /* card background */
  --text:    #1a1a18;   /* main text */
  --text2:   #666660;   /* secondary text */
}
```

For example, to make the app blue instead of green:
```css
--green:  #185FA5;
--green2: #0C447C;
```

---

### Add a new column to the shops table
1. Open `index.html` — the table structure is in the modals section
2. Open `app.js` — find `renderShops()` function
3. Add your field to the `saveShop()` object, the `fillShopForm()` function, and the table row in `renderShops()`

Example — adding a "State" field:

In `index.html`, inside the mShop modal add:
```html
<div class="fg"><label>State</label><input id="s-state" placeholder="CA" /></div>
```

In `app.js`, inside `fillShopForm()` add:
```js
document.getElementById('s-state').value = data?.state || '';
```

Inside `saveShop()` add to the obj:
```js
state: document.getElementById('s-state').value.trim(),
```

Inside `renderShops()`, add `<td>${s.state}</td>` to the row and `<th>State</th>` to the header.

---

### Change how many days before a shop shows as "overdue"
Open `app.js`, find the `urgencyTag()` function:

```js
function urgencyTag(days) {
  if (days > 14) return '<span class="tag tr">Overdue</span>';  // change 14
  if (days > 7)  return '<span class="tag ta">Due soon</span>'; // change 7
  return '<span class="tag tg">OK</span>';
}
```

Change `14` and `7` to whatever number of days you want.

---

### Add a new payment method
Open `app.js`, find `fillPayForm()`, and inside the HTML for `p-method` add your option:

Or open `index.html` and find the select element with id `p-method`:
```html
<select id="p-method">
  <option>Cash</option>
  <option>Bank transfer</option>
  <option>Zelle</option>
  <option>Check</option>
  <option>Other</option>        ← add new options here
</select>
```

---

### Export data to CSV (backup)
Add this button anywhere in the app and the function to `app.js`:

Button (add in index.html wherever you want):
```html
<button class="btn" onclick="exportCSV()">Export orders CSV</button>
```

Function (add at the bottom of app.js):
```js
function exportCSV() {
  const header = ['Date','Shop','Product','Qty','Unit Price','Total','Status'];
  const rows = DB.orders.map(o => [
    o.date, shopName(o.shopId), o.prodName, o.qty, o.price, o.total, o.status
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv,' + encodeURIComponent(csv);
  a.download = 'orders.csv';
  a.click();
}
```

---

### Where is the data stored?
All data is stored in your browser's **localStorage**.
This means:
- It stays there when you close and reopen the browser ✅
- It is saved per browser — if you switch to a different computer, the data won't be there
- If you clear your browser data/cache, it will be deleted ⚠️

**To back up your data:** Use the CSV export above, or open your browser console (F12) and type:
```js
console.log(JSON.stringify(DB));
```
Copy the output — that is all your data.

**To restore data:** In the console type:
```js
localStorage.setItem('cd_shops', JSON.stringify([ ...your shops array... ]));
location.reload();
```

---

## How to update the app on GitHub

After making changes to any file:
1. Go to your GitHub repo
2. Click on the file you changed (e.g. `style.css`)
3. Click the pencil icon (Edit)
4. Paste your new code
5. Click **Commit changes**

The live site updates automatically within 1 minute.

---

## Questions?
If you want to add a feature or something is not working,
copy the error message from your browser console (F12 → Console tab)
and ask for help.

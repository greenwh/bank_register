# Checkbook PWA

A simple, fast, and offline-first progressive web app (PWA) for managing a personal checkbook register. Built with a frontend-only stack using vanilla HTML, CSS, and JavaScript, it provides a clean, mobile-friendly interface for tracking transactions without needing a backend server or an internet connection.

The app leverages modern browser technologies like IndexedDB for primary storage and Service Workers for a complete offline experience, ensuring your data is always available and secure on your device.

## Core Features

*   **Add & Delete Transactions:** Quickly add new deposits or withdrawals and remove incorrect entries.
*   **Automatic Running Balance:** The balance is calculated instantly and updates automatically as you add, delete, or filter transactions. The balance turns red if it becomes negative.
*   **Transaction Reconciliation:** Mark transactions as reconciled with a simple checkbox, just like a traditional checkbook.
*   **Powerful Filtering:** Easily find transactions by date range, description, category, or reconciliation status.
*   **Data Purging:** Keep your register clean by purging old, reconciled transactions up to a specific date you choose.
*   **100% Offline Functionality:** Thanks to a Service Worker, the app is fully functional without an internet connection after the first visit.
*   **Persistent On-Device Storage:** Uses IndexedDB as the primary database with a Local Storage backup for data redundancy. All data stays on your device and is never sent to a server.
*   **Data Backup & Restore:** Export your entire transaction history to a JSON file for safekeeping and import it back at any time.
*   **Installable (PWA):** Can be "installed" on mobile or desktop devices for a native app-like experience directly from the browser.
*   **Responsive Design:** Optimized for a clean, uncluttered experience on mobile phones but is fully usable on desktop screens.

## Technology Stack

*   **HTML5:** For the application's structure.
*   **CSS3:** For styling and the mobile-first, responsive layout.
*   **Vanilla JavaScript (ES6+):** For all application logic, without any frameworks or libraries.
*   **IndexedDB:** The primary client-side database for storing transaction data.
*   **Local Storage:** Used as a secondary backup/sync mechanism for IndexedDB data.
*   **Service Workers:** For caching application assets and enabling full offline functionality.
*   **Web App Manifest:** Allows the application to be installed on a user's home screen or desktop.

## How to Run Locally

Because this application uses Service Workers and IndexedDB, it must be served from a web server to function correctly. **You cannot simply open the `index.html` file directly in your browser from the file system (`file:///...`).**

The easiest way to run a local server is by using Python's built-in HTTP server.

**Instructions:**

1.  **Download the Code:**
    Download and unzip the project files, or clone the repository if you have Git installed.

2.  **Open a Terminal:**
    Navigate your terminal (Command Prompt, PowerShell, or Terminal) into the project's root directory (the folder containing `index.html`).

3.  **Start the Local Server:**
    Run the following command in your terminal. If you have Python 3 (most common), use the first command.

    ```bash
    # For Python 3
    python -m http.server
    ```
    or
    ```bash
    # For Python 2
    python -m SimpleHTTPServer
    ```

4.  **Open the App in Your Browser:**
    The terminal will output a message like `Serving HTTP on 0.0.0.0 port 8000 (http://0.0.0.0:8000/) ...`. Open your web browser and navigate to:

    **`http://localhost:8000`**

The application should now be running.

## Project Structure

```
.
├── index.html         # The main HTML file with the app's structure.
├── style.css          # All CSS styles for the application.
├── script.js          # The core application logic in vanilla JavaScript.
├── sw.js              # The Service Worker script for caching and offline support.
└── manifest.json      # The PWA manifest for installability.
└── README.md          # This file.
```
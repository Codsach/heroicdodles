# Heroic Doodles - A Firebase Studio Project

This is a Next.js web application built in Firebase Studio. It's a simple game where you draw a weapon (sword, gun, or shield), and a Genkit AI model classifies it, allowing you to use it in a mini-game.

## Getting Started

Follow these instructions to get the project up and running on your local computer for development and testing purposes.

### Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js**: Version 18.x or later. You can download it from [nodejs.org](https://nodejs.org/). This will also install `npm` (Node Package Manager), which is required to manage the project's dependencies.
*   **Visual Studio Code**: A code editor. You can download it from [code.visualstudio.com](https://code.visualstudio.com/).
*   **A Google AI API Key**: The weapon classification feature uses the Gemini model through Genkit. You can get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Step-by-Step Instructions

#### 1. Open the Project in VS Code

First, open the project folder in Visual Studio Code.

#### 2. Set Up Environment Variables

The project uses an environment variable to securely store your Google AI API key.

*   In the root of your project, create a new file named `.env`.
*   Open the `.env` file and add the following line, replacing `YOUR_API_KEY_HERE` with the key you obtained from Google AI Studio:

```
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

This file is listed in `.gitignore` and will not be committed to source control.

#### 3. Install Dependencies

Next, you need to install all the packages and libraries the project depends on.

*   Open the integrated terminal in VS Code (**View** > **Terminal**).
*   Run the following command. This will read the `package.json` file and download all the necessary dependencies into a `node_modules` folder.

```bash
npm install
```

#### 4. Run the Development Servers

This project requires two separate development servers to run simultaneously: one for the Next.js web application and one for the Genkit AI flows.

*   **Terminal 1: Run the Next.js App**
    In your first terminal window, run this command to start the main web application:

    ```bash
    npm run dev
    ```

    This will start the Next.js development server, usually on `http://localhost:9002`. You'll see a confirmation message in the terminal once it's ready.

*   **Terminal 2: Run the Genkit AI Server**
    You need a second terminal to run the AI backend.
    *   Open another terminal in VS Code (click the `+` icon in the terminal panel).
    *   In this new terminal, run the following command:

    ```bash
    npm run genkit:dev
    ```
    This starts the Genkit development server, which handles the AI-powered weapon classification.

#### 5. View Your Application

With both servers running, you can now access the application.

*   Open your web browser and navigate to: **[http://localhost:9002](http://localhost:9002)**

You should now see the "Heroic Doodles" application running. You can draw a weapon, classify it, and play the game. Any changes you make to the code in VS Code will automatically reload the application in your browser.

# OVERALL PROJECT OVERVIEW
This name of the entire business is called Agentfolio. It is a place where we have multiple AI agents / automations that users can create for their business. We are starting with just one agent called the welcome agent.

Users login via Google and we have firebase set up as our database and auth system.

Users can switch between workspaces that act as almost individual accounts and invite users to individual workspaces with different agents on different workspaces. 

# Welcome Agent Overview

The Welcome Agent is the first core agent we're building. It's designed for businesses whose end users sign up for a product or service. When someone signs up, the Welcome Agent gathers information about the person and their business using a series of prompts. It then uses AI to craft a personalized email, leveraging context about the business from our backend. Users can connect their Google account to send these emails automatically and attach their business website + additional context so we understand what the end users are signing up for as well.

We will use OpenRouter API to run API calls and add a simple webpage crawler for the website crawling in the welcome agent. 


# How the Welcome Agent Works

## View all welcome agents page
This page simply shows all the welcome agents created in the workspace that users are in with ability to edit, delete them, turn them on or off.


## User Flow of the Configuration Page

### 1. Access the Welcome Agent Setup
- The user begins by accessing the `welcome-agent.tsx` page.  
- It should start as **“Untitled Welcome Agent”**, giving the user the ability to edit the name of their Welcome Agent.

### 2. Define Email Purpose and Customization
- In the **Email Purpose** section:
  - Users select the purpose of the email from predefined templates in a dropdown.
  - They can refine the AI's behavior by customizing the directive for generating the email, allowing for a more tailored tone or style.

### 3. Provide Business Context
- In the **Your Business Context** section:
  1. Users input their website URL. Our app should then crawl that page and save only the body content (stripping away HTML, images, JS, etc.) to gather relevant business info.
  2. Once done, we use **GPT4o-mini** to summarize the content of their webpage.
  3. If the webpage cannot be accessed via a crawl, we should let the user know to add content about their business (such as their homepage information) in the **Additional Context** area. It should display **“crawl failed”**.
  4. Users must also describe what the end users are signing up for, ensuring the generated emails are specific and meaningful (**required**).
  5. Additional context can be added as needed for further personalization.

### 4. Generate and Preview the Email
- **Validation**:
  1. This step tests the agent and the AI directive.
  2. Users click the **“Generate Email Preview”** button to see a draft of the personalized email, which appears in the **Email Preview** section on the right.
  3. In order for the **“Generate Email Preview”** button to be clickable, the user should have:
     - Set up at least the AI directive
     - Filled out the reason for signing up (from **Business Context**)
     - Attempted to crawl their webpage (even if it failed, it counts as an attempt)
  4. If any required fields are missing, those areas are highlighted, and the user is directed to fill them out.
  5. Once the user has all required fields and clicks **Generate Email Preview**, a popup appears where they can provide the signup information (this simulates the data that would come in via email when the user does the **“Connect New Contacts”** configuration).
  6. After clicking **“Generate Email Preview”** inside the popup, the system runs the series of AI prompts (detailed below) via Open AI to generate the email.

### 5. Prompts
Below are the prompts used. **Note**: These should remain largely unchanged in implementation.

1. **First Prompt (perplexity/llama-3.1-sonar-huge-128k-online)**  
   ```
   Do a search for this user. Here's the sign up email we got with their info: {{Signup Information}}. 
   Make sure to only look at the user’s info. 
   Come back with only info about who they are, what business they work for, etc. 
   Include contact information if you can find it. 
   Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
   For extra context, they signed up for: {{input the “what are people signing up for” field saved by the user under business context}}
   ```

2. **Second Prompt (perplexity/llama-3.1-sonar-huge-128k-online)**  
   ```
   Do a search for the business associated with this signup: {{Input “Signup Information” from the popup}}... 
   -- Come back with only info about who they are, what business they do, industry, etc. 
   Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
   For extra context, they signed up for {{input the “what are people signing up for” field saved by the user under business context}}
   ```

3. **Third Prompt (anthropic/claude-3.5-sonnet)**  
   ```
   We are writing the body of a personalized email today to a new lead that just signed up 
   (keep it max of 3 paragraphs and MAX 1-2 sentences per paragraph). 
   Do not include the subject line. 
   Make it read like a human sent it after looking up their company and make it clear we know what they do without jargon.  
   Make it pretty casual and welcoming with an 8th grade reading level. 
   If there's no specific info at all about the signup, just make it generic 
   (and don't make a note that it is a template). 
   Address the person by first name if available (but just make it general if no name is provided). 
   Sign off from the name {{input name of attached Gmail account or placeholder to let user know that it will fill this out with the name from the Gmail account}} 

   Here's what you should do in this email: {{input AI directive}}  

   ______ Here's the context on this person: {{input the ai response from prompt #1}}  
   _____ Here's the context on this person's business: {{input the ai response from prompt #2}}   
   _______ Frame it in a way where you saw they just signed up for: 
   {{input the “what are people signing up for” field saved by the user under business context}} 
   _________ And lastly, here's the context on my business: 
   {{input short summary of users website + additional context info}}
   ```

4. **Fourth Prompt**  
   ```
   Write an email subject line for this email below. 
   Do not use any placeholders. 
   Only return one short email subject line and make it look like it's a personal email 
   to them from someone they know and they want to click it. 
   (do not mention that it's a subject line or return anything other than the subject line). 

   Here's the email: {{input the ai response from prompt #3}}
   ```

- After these prompts are complete, the system places the generated email into the **Email Preview** area.
- In the live environment (after publishing), this same chain of prompts will run automatically when a user sends a notification email about a new signup.

### 6. Configure Sending Options
- Clicking the **“Configure”** button opens the **Configure Welcome Agent** modal.

### 7. Connect Email Account

When the user arrives at this step, they should see a dropdown of previously connected email accounts (if any exist in the current workspace). Below the dropdown or alongside it, there should be a **“Connect a New Email”** button to initiate the process of authorizing a new Gmail account. Here’s how we can do it technically:

1. **Create a Google Cloud Project and OAuth Consent Screen**  
   I already did this and generated **OAuth client credentials** (type: `Web application`) and set the **authorized redirect URI** to point back to our application (e.g., `https://936f9f5e-b596-4eec-be4b-6f7f19e7f0b7-00-8nnd3a2nu6we.worf.replit.dev/api/google/callback`).

2. **“Connect a New Email” Button & Popup**  
   - On the Welcome Agent configuration screen (in the Configure modal or a dedicated UI element for email), add a **“Connect a New Email”** button.  
   - When clicked, open a **popup window** that redirects the user to your backend endpoint (e.g., `api/connect-google`) which handles the OAuth flow.  
   - Alternatively, you can redirect the main window, but a popup often provides a better user experience and keeps them on the same page.

3. **Handle OAuth Flow**  
   - In your backend (`/api/connect-google`), create an OAuth flow using [Google’s OAuth2 client libraries](https://developers.google.com/identity/protocols/oauth2/web-server).  
   - Redirect the user to Google’s OAuth endpoint with the necessary scopes (`https://mail.google.com/` or a narrower set of scopes like `gmail.send`).  
   - After the user consents, Google will redirect them back to your **redirect URI** (e.g., `/api/google/callback`) with a code.

4. **Exchange Code for Tokens**  
   - In your callback endpoint, exchange the **authorization code** for **access and refresh tokens**.  
   - **Store these tokens** (particularly the refresh token) in your database (e.g., Firestore) under the user’s **workspace**. You might store it in a sub-collection called `workspace/{workspaceId}/integrations/{gmailAccountId}` or something similar.  
   - You’ll also want to store metadata like:  
     - The connected **email address**  
     - The **user’s name** (which is used for the “From” name in emails)  
     - **Date/time** the account was connected  
   - If you need to send on behalf of a domain, ensure the user’s domain is verified, etc., but typically, sending from a personal or work Gmail is enough.

5. **Refresh Token Strategy**  
   - You’ll periodically need to **refresh** the Google access token when it expires.  
   - Use a server-side function or scheduled job to refresh tokens so the user doesn’t lose the ability to send emails mid-session.  
   - The Google OAuth library can handle refreshes automatically if you store the refresh token and re-initialize the client properly.

6. **Updating the UI**  
   - Once the OAuth callback completes successfully, you can **close the popup** and notify the main window to **reload** the list of connected Gmail accounts.  
   - The newly connected account should now appear in the dropdown.  
   - Allow the user to select that newly connected Gmail to send their Welcome Agent emails. You can display the user’s **email address** and potentially a **“From”** name if you fetched it from Google’s Profile API.

7. **Selecting the Gmail Account for the Agent**  
   - In the **Welcome Agent** configuration screen, once a user has connected at least one Gmail account, they can pick it from a dropdown.  
   - Store that selection in the **welcome agent’s config** in your database so you know **which** connected Gmail account to use for sending.

8. **Sending Emails**  
   - Whenever a new signup triggers the Welcome Agent, your system will:  
     1. **Generate** the email body and subject via the OpenRouter prompts described above.  
     2. **Retrieve** the correct workspace Gmail credentials from Firestore (the tokens).  
     3. **Use** the [Gmail API send method](https://developers.google.com/gmail/api/v1/reference/users/messages/send) to dispatch the email on behalf of that user.  
     4. **Log** the result in the **Admin Logs** section, indicating whether sending was successful or failed.

9. **Revoking / Managing Connections**  
   - Optionally, provide a way for users to **revoke** or **remove** a connected Gmail account.  
   - This might involve removing the tokens from your database and letting the user know they’ll no longer be able to send from that account.

By following these steps, we ensure that users can seamlessly **connect their Gmail accounts** via OAuth, choose them in the Welcome Agent setup, and have all future Welcome emails sent from their **real** Gmail address.


### 8. Connect New Contacts

Users set up the process to notify us of new signups by sending those signup details to a **unique email address** we provide. Below is how we do it with **Mailgun**, including creating a webhook route that forwards to:
https://936f9f5e-b596-4eec-be4b-6f7f19e7f0b7-00-8nnd3a2nu6we.worf.replit.dev/api/inbound-email

- **Mailgun Domain Setup** (ALREADY DONE)  
  1. Purchase or configure a domain (e.g., `notifications.agentfolio.ai`) for receiving mail.  
  2. In the Mailgun dashboard, verify the domain and add required DNS records (MX, TXT, etc.).  
  3. Ensure inbound email is enabled for that domain under Mailgun’s “Receiving” settings.

- **Generate a Unique Email for Each Welcome Agent**  
  1. Whenever a user creates a new Welcome Agent, the system generates a unique address such as `agent-123abc@notifications.agentfolio.ai`.  
  2. Store this local part (`agent-123abc`) in your database so you can identify which agent an incoming email is for.

- **Provide the Notification Address to the User**  
  1. Display this unique email in the Welcome Agent config screen.  
  2. The user adds that address (e.g., `agent-123abc@notifications.agentfolio.ai`) to their signup form’s “Notification” or “CC” list.  
  3. Any new signup info will now be emailed to that address.

- **Create a Mailgun Route to Forward Incoming Emails**  
  1. In Mailgun, navigate to “Routes” and create a new route.  
  2. Use a **Catch All** (or a regex match) for `notifications.agentfolio.ai`.  
  3. Set the action to **Forward** the message to:  
     ```
     https://936f9f5e-b596-4eec-be4b-6f7f19e7f0b7-00-8nnd3a2nu6we.worf.replit.dev/api/inbound-email
     ```
  4. (Optionally) add a “Stop” action if you want no other routes to be processed after this one.  
  5. Save the route.

- **Handle Inbound Emails at the /api/inbound-email Endpoint**  
  1. When Mailgun forwards an email, it includes metadata (recipient, sender, subject, stripped text).  
  2. Parse the `recipient` to find which Welcome Agent it belongs to (e.g., `agent-123abc`).  
  3. Extract the signup details from the email body, ignoring signatures or footers if needed.  
  4. Pass the parsed information to the **Welcome Agent** logic:
     - Trigger the AI prompts (#1, #2, #3, #4) to generate a personalized welcome email.  
     - Send the final email via the user’s **connected Gmail** (or other configured provider).

- **Admin Logs**  
  1. Record each inbound email event, including:
     - Timestamp  
     - Recipient (the unique address)  
     - Parsed content  
     - AI prompt responses  
  2. Record whether the final email send was successful (and any error details).

With this setup, every time a new lead signs up and an email is sent to the unique address, the system automatically triggers the Welcome Agent to craft and send a personalized welcome email—completing the end-to-end flow.


### 9. Save and Publish or Save as Draft and the **“Go Back”** Option
- Once the configuration is complete:
  - **Save & Publish**: Makes the agent live. Any emails sent to the unique email address will trigger this automation, using the body of the notification email (ignoring footers, etc.).
  - **Save as Draft**: The user can revisit and refine the setup later. This does not require any fields to be filled.
- **Go Back** option:
  - If the user has saved the draft and made no further changes, they can simply go back without any prompt.
  - If there are unsaved changes, a popup should ask whether to **Save** or **Exit Without Saving**.

---

## Admin Side
- We need a **“Logs”** sidebar menu item.
- This **Logs** page shows a log of:
  - Every API call to OpenRouter  
  - Every website crawl  
  - Every email that comes into the unique email addresses  
  - Whether the response was successful or failed, along with AI responses  
- Make this log paginated and include as much relevant detail as possible.

---


## Code Structure
Here's the general structure of the code and where we should put things

app/
├── components/
│   ├── common/                     # Reusable UI components              
│   │   ├── agent-specific/         # UI components specific to agents
│   │   │   └── welcome-agent/      # Components for the Welcome Agent
│   │   │       ├── configuration-panel.tsx  # Modular subcomponents for the configuration page
│   │   │       └── preview.tsx             # Optional preview component if needed
│   │   ├── toast.tsx              # Toast notifications
│   │   └── use-toast.ts           # Hook for managing toasts
│   ├── shared/                    # Shared logic, utilities, and hooks
│   │   ├── hooks/                 # Custom React hooks
│   │   └── utils/                 # Utility functions
├── agents/
│   └── welcome-agent/             # All logic and services for the Welcome Agent
│       ├── index.ts               # Entry point for Welcome Agent logic
│       ├── api.ts                 # API calls for the Welcome Agent
│       └── logic.ts               # Business logic for the Welcome Agent
├── pages/
│   └── welcome-agent.tsx          # Main configuration page for the Welcome Agent

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
- Users can select an existing connected email account or add a new one (e.g., via Gmail account integration).
  - **Note**: This is **different** from merely signing in with Google to access our platform. We need actual Gmail API integration to let users send from their Gmail accounts.  
  - Gmail accounts get saved to workspaces so that a specific workspace can reuse accounts already set up.
- After the agent is published, welcome emails will be sent from this connected account whenever the user sends us a notification email indicating a new signup.

### 8. Connect New Contacts
- Users set up the process to notify us of new signups:
  1. We generate a unique email address for each Welcome Agent.  
  2. The user adds this unique email address as a notification address in their existing signup form (outside our platform).  
  3. When someone signs up, their details are sent to our unique email address, triggering the Welcome Agent to generate and send a personalized email according to the agent’s settings.

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

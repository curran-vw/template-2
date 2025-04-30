"use server";

import * as cheerio from "cheerio";
import { addLog } from "@/firebase/logs-utils";
import { requireAuth } from "@/firebase/auth-utils";

interface CrawlParams {
  url: string;
  workspaceId: string;
  agentId?: string;
}

export async function crawlWebsite({ url, workspaceId, agentId }: CrawlParams) {
  await requireAuth();

  try {
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      await addLog({
        type: "crawl",
        status: "failed",
        details: `Invalid URL: ${url}`,
        workspaceId,
        agentId,
      });
      return { error: "Invalid URL" };
    }

    // Create initial log entry
    await addLog({
      type: "crawl",
      status: "pending",
      details: `Starting crawl of ${url}`,
      workspaceId,
      agentId,
    });

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AgentfolioBot/1.0; +https://agentfolio.ai)",
      },
    });

    if (!response.ok) {
      await addLog({
        type: "crawl",
        status: "failed",
        details: `Failed to fetch ${url}`,
        response: `Status: ${response.status} ${response.statusText}`,
        workspaceId,
        agentId,
      });
      return { error: "Failed to fetch webpage" };
    }

    // Get the HTML content
    const html = await response.text();

    // Use cheerio to parse the HTML
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script").remove();
    $("style").remove();
    $("noscript").remove();
    $("iframe").remove();
    $("svg").remove();
    $("img").remove();
    $("header").remove();
    $("footer").remove();
    $("nav").remove();
    $(".header").remove();
    $(".footer").remove();
    $(".nav").remove();
    $(".menu").remove();
    $(".sidebar").remove();
    $(".advertisement").remove();
    $(".cookie-banner").remove();

    // Get the cleaned text content
    let text = $("body").text().replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();

    // Truncate if too long (OpenRouter has context limits)
    const MAX_CHARS = 15000;
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS) + "...";
    }

    // Log the OpenRouter API call
    await addLog({
      type: "api",
      status: "pending",
      details: `Sending content to OpenRouter for summarization`,
      workspaceId,
      agentId,
    });

    // Now let's summarize with GPT4o-mini via OpenRouter
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://agentfolio.ai",
        "X-Title": "Agentfolio",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that summarizes website content into clear, concise business descriptions. Focus on what the business does, who they serve, and their main value proposition.",
          },
          {
            role: "user",
            content: `Please summarize this website content in 2-3 sentences, focusing on the core business offering:\n\n${text}`,
          },
        ],
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      await addLog({
        type: "api",
        status: "failed",
        details: "OpenRouter API error",
        response: errorText,
        workspaceId,
        agentId,
      });
      return { error: "Failed to summarize content" };
    }

    const aiResponse = await openRouterResponse.json();
    const summary = aiResponse.choices[0].message.content;

    // Log successful completion
    await addLog({
      type: "crawl",
      status: "success",
      details: `Successfully crawled and summarized ${url}`,
      response: summary,
      workspaceId,
      agentId,
    });

    return {
      success: "Successfully crawled and summarized website",
      summary,
    };
  } catch (error) {
    await addLog({
      type: "crawl",
      status: "failed",
      details: `Error processing ${url || "unknown URL"}`,
      response: error instanceof Error ? error.message : "Unknown error",
      workspaceId,
      agentId,
    });
    return { error: "Failed to process webpage" };
  }
}

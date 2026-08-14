package network.models

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector

data class AgentMeta(
    val id: String,
    val title: String,
    val badge: String,
    val subtitle: String,
    val icon: ImageVector,
    val capabilities: List<String>,
    val quickPrompts: List<QuickPrompt>
)

data class QuickPrompt(val label: String, val prompt: String)

data class CreativeTemplate(
    val id: String,
    val name: String,
    val creator: String,
    val category: String,
    val description: String,
    val icon: ImageVector,
    val promptExample: String
)

val AGENTS_METADATA = listOf(
    AgentMeta(
        "ECONOMIC_RESEARCH_AGENT", "Global Economic Research Agent", "Live Markets",
        "Real-time commodities & macro trends", Icons.Outlined.Public,
        listOf("Inflation Indexing", "Consumer Sentiment", "Supply Chain FX"),
        listOf(QuickPrompt("Commodity Forecasts", "Summarize the latest commodity forecasts for Q3."))
    ),
    AgentMeta(
        "MARKETING_COORDINATOR_AGENT", "Regional Marketing Coordinator", "Campaigns",
        "Cross-channel promotion & local SEO", Icons.Outlined.Campaign,
        listOf("A/B Testing Copy", "Ad Spend Allocation", "Social Listening"),
        listOf(QuickPrompt("Draft a Social Post", "Draft a social post highlighting our new eco-friendly line."))
    ),
    AgentMeta(
        "BRAND_STUDIO_AGENT", "Creative Brand Studio Agent", "Gen Media",
        "Visual assets & style enforcement", Icons.Outlined.Palette,
        listOf("Video Rendering", "Tone of Voice", "Image Variations"),
        listOf(QuickPrompt("Generate Ad Concept", "Generate an ad concept for a summer apparel launch."))
    ),
    AgentMeta(
        "GLOBAL_CLIENT_AUDIT_AGENT", "Global Client Audit Agent", "Security",
        "Compliance, risk & account forensics", Icons.Outlined.Shield,
        listOf("Fraud Detection", "GDPR Checks", "Contract Analysis"),
        listOf(QuickPrompt("Run Compliance Check", "Run a compliance check on our latest user data policy."))
    )
)

val CREATIVE_TEMPLATES = listOf(
    CreativeTemplate("tmpl-1", "Cinematic Product Reveal", "SpressoStudio", "Video", "A dramatic 60fps slow-pan across luxury textures with cinematic lighting.", Icons.Outlined.Movie, "Generate a slow panning shot of a sleek leather handbag under dramatic spotlight."),
    CreativeTemplate("tmpl-2", "Minimalist E-Comm", "AI_Design_Lab", "Image", "Clean white background, soft shadow, perfect for Shopify / web catalogs.", Icons.Outlined.Image, "A minimalist studio shot of a modern ceramic coffee mug on a white background."),
    CreativeTemplate("tmpl-3", "GenZ UGC Style", "TrendSetter_99", "Community", "Handheld phone style, dynamic, bright colors, TikTok ready format.", Icons.Outlined.Smartphone, "A bright, energetic vertical video of someone unboxing a new sneaker."),
    CreativeTemplate("tmpl-4", "Cyberpunk Glow", "NeonDreamer", "Experimental", "Neon rim lights, dark moody backgrounds, tech-wear styling.", Icons.Outlined.Lightbulb, "A futuristic smartwatch floating with glowing neon blue rim lighting."),
    CreativeTemplate("tmpl-5", "High-Fashion Editorial", "Vogue_AI", "Prompting", "Complex prompt template for achieving magazine-cover quality output.", Icons.Outlined.AutoAwesome, "A high-fashion editorial photo of a model wearing an avant-garde dress, studio lighting.")
)

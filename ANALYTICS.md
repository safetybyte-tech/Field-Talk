# Analytics

Field Talk sends anonymous page views and page leaves to the existing Safety Net Dispatch PostHog project (259150, US Cloud). Filter by `tool_slug = field-talk` or hostname.

The public project token is write-only. Analytics run only on Safety Net Dispatch subdomains. No login identity, form text, attendee information, calculator inputs, session replay, heatmaps, or error contents are captured. Full URL query strings and fragments are removed before sending; referrers retain only their origin, plus the host as `$referring_domain` for source reports. Bounded UTM source, medium, campaign, and content slugs are kept as separate event properties for attribution. Browser Do Not Track is respected. Ad blockers or SDK failures must not prevent the tool from working.

Implementation: `public/snd-analytics-v1.js` loaded asynchronously from the HTML entry pages. PostHog SDK configuration: https://posthog.com/docs/libraries/js/config

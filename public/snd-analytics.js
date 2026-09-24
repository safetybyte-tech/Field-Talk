/* Safety Net Dispatch: anonymous page analytics only. No form capture or replay. */
(function () {
  'use strict';
  // Avoid development/preview traffic and duplicate initialization.
  if (!location.hostname.endsWith('.safetynetdispatch.com') || window.__sndAnalyticsLoaded) return;
  window.__sndAnalyticsLoaded = true;
!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="ci init Pi Ci ft Oi Fi ki capture calculateEventProperties Ui register register_once register_for_session unregister unregister_for_session Bi getFeatureFlag getFeatureFlagPayload getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty ji Di createPersonProfile setInternalOrTestUser zi Ti Hi opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ai debug bt Ni getPageViewId captureTraceFeedback captureTraceMetric Ei".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  posthog.init('phc_DrnnvnT6Q2VUlk2gH9THcncgVBhFjLeCBcygM659oTB', {
    api_host: 'https://us.i.posthog.com',
    defaults: '2026-05-30',
    person_profiles: 'never',
    autocapture: false,
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    disable_session_recording: true,
    disable_surveys: true,
    advanced_disable_flags: true,
    respect_dnt: true,
    ip: false,
    before_send: function (event) {
      if (!event || (event.event !== '$pageview' && event.event !== '$pageleave')) return null;
      var props = event.properties || {};
      // Allow only anonymous technical metrics; never forward arbitrary SDK,
      // person, campaign, URL, or application properties.
      var allowed = ['distinct_id', '$device_id', '$session_id', '$window_id',
        '$lib', '$lib_version', '$browser', '$browser_version', '$os', '$os_version',
        '$device_type', '$screen_height', '$screen_width', '$viewport_height',
        '$viewport_width', '$host', '$time', '$insert_id', '$event_type',
        '$pageview_id', '$prev_pageview_id', '$prev_pageview_duration',
        '$prev_pageview_max_scroll_percentage', '$prev_pageview_last_scroll_percentage',
        '$is_identified', '$process_person_profile', '$geoip_disable'];
      Object.keys(props).forEach(function (key) {
        if (allowed.indexOf(key) === -1) delete props[key];
      });
      props.$geoip_disable = true;
      props.$current_url = location.origin + location.pathname;
      props.$pathname = location.pathname;
      try { props.$referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch (_) { props.$referrer = ''; }
      props.tool_name = "Field Talk";
      props.tool_slug = "field-talk";
      event.properties = props;
      return event;
    }
  });

})();

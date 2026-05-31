/**
 * Resolves external and rich presence asset images to valid URLs.
 */
function getAssetImageUrl(applicationId, assetId) {
  if (!assetId) return null;
  
  if (assetId.startsWith('mp:external/')) {
    return `https://media.discordapp.net/external/${assetId.slice(12)}`;
  }
  if (assetId.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${assetId.slice(8)}`;
  }
  return `https://cdn.discordapp.com/app-assets/${applicationId}/${assetId}.png`;
}

/**
 * Maps the activity type to specific prefix labels, Font Awesome icons, and text fields.
 */
function getActivityDetails(activity) {
  const type = activity.type;
  let prefix = '';
  let iconClass = 'fa-solid fa-circle-info';
  let title = activity.name;
  let subtitle = activity.details || '';
  let extra = activity.state || '';
  let emojiHtml = '';

  if (activity.emoji) {
    if (activity.emoji.id) {
      const ext = activity.emoji.animated ? 'gif' : 'png';
      emojiHtml = `<img src="https://cdn.discordapp.com/emojis/${activity.emoji.id}.${ext}" alt="${activity.emoji.name}" style="width: 18px; height: 18px; vertical-align: middle; margin-right: 4px; border-radius: 2px;" />`;
    } else if (activity.emoji.name) {
      emojiHtml = `<span style="margin-right: 4px; font-size: 15px; vertical-align: middle;">${activity.emoji.name}</span>`;
    }
  }

  switch (type) {
    case 0: // Playing Game
      prefix = 'Playing';
      iconClass = 'fa-solid fa-gamepad';
      break;
    case 1: // Streaming
      prefix = 'Streaming';
      iconClass = 'fa-solid fa-video';
      break;
    case 2: // Listening to music
      prefix = 'Listening to';
      iconClass = 'fa-solid fa-music';
      title = activity.details || activity.name;
      subtitle = activity.state ? `by ${activity.state}` : '';
      extra = activity.name !== 'Spotify' && activity.name !== 'YouTube Music' ? `on ${activity.name}` : '';
      break;
    case 3: // Watching
      prefix = 'Watching';
      iconClass = 'fa-solid fa-tv';
      break;
    case 4: // Custom Status
      prefix = 'Status';
      iconClass = 'fa-solid fa-comment-dots';
      title = activity.state || '';
      subtitle = '';
      extra = '';
      break;
    case 5: // Competing
      prefix = 'Competing in';
      iconClass = 'fa-solid fa-trophy';
      break;
  }

  return { prefix, iconClass, title: `${emojiHtml}${title}`, subtitle, extra };
}

/**
 * Fetches data from Lanyard and renders/updates the animated profile card inside `#activity`.
 */
async function updateLanyardActivity(userId) {
  const container = document.getElementById('activity');
  if (!container) return;

  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${userId}`);
    const result = await response.json();

    if (!result.success) return;

    const { discord_user, discord_status, activities } = result.data;

    // Online status color mappings
    const STATUS_COLORS = {
      online: '#23a55a',
      idle: '#f0b232',
      dnd: '#f23f43',
      offline: '#80848e'
    };

    const statusColor = STATUS_COLORS[discord_status] || STATUS_COLORS.offline;
    const avatarUrl = getAvatarUrl(discord_user);

    const primaryActivity = activities.find(act => act.type !== 4) || activities[0];

    let badgeHtml = '';
    let detailsInnerHtml = '';
    let hasActivityClass = '';

    if (primaryActivity) {
      hasActivityClass = 'has-activity';
      const { prefix, iconClass, title, subtitle } = getActivityDetails(primaryActivity);
      const imageUrl = getAssetImageUrl(primaryActivity.application_id, primaryActivity.assets?.large_image);

      // 1. Icon Badge - Uses <mdui-card> styled as a circle to inherit context matching background color
      badgeHtml = `
        <mdui-card class="status-badge activity-badge" variant="filled" style="
          --shape-corner: 50% !important;
          border-radius: 50% !important;
          width: 2em;
          height: 2em;
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          bottom: -3px;
          right: -3px;
          border: 2.5px solid var(--mdui-color-surface);
          box-shadow: 0 1px 3px rgba(80, 65, 65, 0);
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          z-index: 10;
        ">
          <i class="${iconClass}" style="color: ${statusColor}; font-size: 1em; display: block;"></i>
        </mdui-card>
      `;

      // 2. Expandable Panel inner content
      detailsInnerHtml = `
        <div class="details-inner-content">
          ${imageUrl ? `
            <img src="${imageUrl}" alt="" class="activity-image" />
          ` : ''}
          <div class="text-block">
            <div class="activity-header">
              <i class="${iconClass}"></i>
              <span>${prefix}</span>
            </div>
            <div class="activity-title">${title}</div>
            ${subtitle ? `<div class="activity-subtitle">${subtitle}</div>` : ''}
          </div>
        </div>
      `;
    } else {
      // 3. Fallback standard status circle (when there are no activities)
      badgeHtml = `
        <mdui-card variant="filled" class="status-badge normal-status" style="
          padding: 0.4em;
          width: 2em;
          height:2em;
          position: absolute;
          bottom: -1px;
          right: -1px;
          border-radius: 50%;
        ">
        <div style="
        background-color: ${statusColor}; 
        width: 100%;
        height: 100%;
        border-radius: 50%;
        "></div>
        </mdui-card>
      `;
    }

    let card = document.getElementById('activity-profile-card');

    if (!card) {
      // INITIAL MOUNT: build the CSS wrapper and base elements
      container.innerHTML = `
        <style>
          #activity-profile-card {
            display: inline-flex;
            align-items: center;
            padding: 6px;
            border-radius: 48px;
            transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
            background-color: transparent;
          }

          /* Hover animation triggers only when activities are present */
          #activity-profile-card.has-activity:hover {
            background-color: var(--mdui-color-surface-container-low, #f5f5f5);
            padding-right: 18px;
          }

          #activity-profile-card .pfp-wrapper {
            position: relative;
            display: inline-flex;
            flex-shrink: 0;
            cursor: pointer;
          }

          /* Slide & Reveal Animation wrapper */
          #activity-profile-card .details-wrapper {
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            transition: max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
          }

          #activity-profile-card.has-activity:hover .details-wrapper {
            max-width: 300px;
            opacity: 1;
          }

          #activity-profile-card .details-inner-content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-left: 1em;
            white-space: nowrap;
          }

          #activity-profile-card .activity-image {
            width: 5em;
            height: 5em;
            border-radius: 8px;
            object-fit: cover;
            flex-shrink: 0;
          }

          #activity-profile-card .text-block {
            display: flex;
            flex-direction: column;
            min-width: 0;
            line-height: 1.35;
          }

          #activity-profile-card .activity-header {
            font-size: 0.75em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--mdui-color-primary, #6200ee);
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 5px;
          }

          #activity-profile-card .activity-header i {
            font-size: 1em;
          }

          #activity-profile-card .activity-title {
            font-weight: 600;
            font-size: 1em;
            color: var(--mdui-color-on-surface, #000);
            text-overflow: ellipsis;
            overflow: hidden;
            max-width: 180px;
          }

          #activity-profile-card .activity-subtitle {
            font-size: 0.75em;
            color: var(--mdui-color-on-surface-variant, #666);
            text-overflow: ellipsis;
            overflow: hidden;
            max-width: 180px;
          }
        </style>

        <div id="activity-profile-card" class="${hasActivityClass}">
          <!-- Profile Picture & Status Badge -->
          <div class="pfp-wrapper">
            <mdui-avatar src="${avatarUrl}" style="width: 6em; height: 6em;"></mdui-avatar>
            ${badgeHtml}
          </div>

          <!-- Sliding Details panel container (persists in DOM) -->
          <div class="details-wrapper">
            ${detailsInnerHtml}
          </div>
        </div>
      `;
    } else {
      // SMART UPDATE: Keep the parent card wrapper to retain focus and cursor hover states
      if (hasActivityClass) {
        card.classList.add('has-activity');
      } else {
        card.classList.remove('has-activity');
      }

      // Update avatar if changed
      const avatar = card.querySelector('mdui-avatar');
      if (avatar && avatar.getAttribute('src') !== avatarUrl) {
        avatar.setAttribute('src', avatarUrl);
      }

      // Replace status badge inside pfp-wrapper
      const existingBadge = card.querySelector('.status-badge');
      if (existingBadge) {
        existingBadge.outerHTML = badgeHtml;
      }

      // Update inner contents of details-wrapper
      const detailsWrapper = card.querySelector('.details-wrapper');
      if (detailsWrapper) {
        detailsWrapper.innerHTML = detailsInnerHtml;
      }
    }

  } catch (error) {
    console.error('Error rendering Lanyard card:', error);
  } finally {
    // Schedules the next update regardless of success or network failure
    setTimeout(() => {
      updateLanyardActivity(userId);
    }, 5000);
  }
}

/**
 * Resolves the Discord avatar URL based on user data.
 */
function getAvatarUrl(user) {
  if (!user.avatar) {
    const index = user.discriminator === "0" 
      ? Number(BigInt(user.id) >> 22n) % 6 
      : Number(user.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const isAnimated = user.avatar.startsWith("a_");
  const ext = isAnimated ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}`;
}

// Initial activation
updateLanyardActivity('570470307748380673');
/** All-unit modal comparison workspace. The original map and its state stay mounted. */
export function getComparisonPair(works, sourceId, targetId) {
  const source = works.find(work => work.id === sourceId);
  const target = works.find(work => work.id === targetId);
  return source && target && source !== target && source.comparisonIds.includes(targetId)
    ? [source, target] : null;
}

export function getComparisonNote(source, target, fallback) {
  const note = source.comparisonNotes?.[target.id];
  return typeof note === 'string' && note.trim() ? note : fallback(source, target);
}

/** Bounds are in iframe coordinates; never size a modal from the full embed height. */
export function comparisonViewport({frameTop, frameHeight, hostTop = 0, hostHeight}) {
  const top = Math.max(0, hostTop - frameTop);
  const bottom = Math.min(frameHeight, hostTop + hostHeight - frameTop);
  if (bottom - top <= 48) return null;
  return {top:top + 12, height:Math.min(810, bottom - top - 24)};
}

function fitEmbeddedComparison(panel, win) {
  try {
    const frame = win.frameElement;
    if (!frame || win.parent === win) return () => {};
    const parent = win.parent;
    const viewport = parent.visualViewport;
    const fit = () => {
      if (!panel.open) return;
      const rect = frame.getBoundingClientRect();
      const bounds = comparisonViewport({frameTop:rect.top, frameHeight:win.innerHeight,
        hostTop:viewport?.offsetTop || 0, hostHeight:viewport?.height || parent.innerHeight});
      if (!bounds) return;
      Object.assign(panel.style, {top:bounds.top + 'px', bottom:'auto',
        marginTop:'0', marginBottom:'0', height:bounds.height + 'px', maxHeight:bounds.height + 'px'});
    };
    parent.addEventListener('scroll', fit, true);
    parent.addEventListener('resize', fit);
    win.addEventListener('resize', fit);
    viewport?.addEventListener('resize', fit);
    viewport?.addEventListener('scroll', fit);
    const observer = win.ResizeObserver ? new win.ResizeObserver(fit) : null;
    observer?.observe(frame);
    fit();
    return () => {
      parent.removeEventListener('scroll', fit, true);
      parent.removeEventListener('resize', fit);
      win.removeEventListener('resize', fit);
      viewport?.removeEventListener('resize', fit);
      viewport?.removeEventListener('scroll', fit);
      observer?.disconnect();
    };
  } catch (_) {
    // The current course shell shares an origin. Other hosts retain native layout.
    return () => {};
  }
}

export function mountComparisonStudy(document, api) {
  const window = document.defaultView;
  const filters = document.getElementById('filterContainer');
  const workspace = document.querySelector('.art-workspace');
  if (!filters || !workspace) return;
  const host = document.createElement('div');
  host.className = 'ac-host';
  filters.before(host);
  host.append(filters, workspace);
  let session = null;
  const element = (tag, value, className) => {
    const node = document.createElement(tag);
    if (value) node.textContent = value;
    if (className) node.className = className;
    return node;
  };
  const bilingual = (host, value) => {
    const parts = String(value).match(/^([\s\S]*?。)\s+([A-Z][\s\S]*)$/);
    host.append(element('p', parts ? parts[1] : value));
    if (parts) {
      const english = element('details', '', 'ac-english');
      english.append(element('summary', 'English'), element('p', parts[2]));
      host.append(english);
    }
  };
  function close() {
    if (!session) return;
    const saved = session;
    session = null;
    saved.clearViewport?.();
    saved.panel.close();
    saved.panel.remove();
    document.body.style.overflow = saved.bodyOverflow;
    filters.inert = false;
    workspace.inert = false;
    host.classList.remove('ac-is-open');
    document.getElementById('detailPanel').scrollTop = saved.detailScroll;
    const trigger = saved.trigger.isConnected ? saved.trigger : [...document.querySelectorAll('[data-compare-target]')]
      .find(button => button.dataset.compareSource === saved.pair[0].id && button.dataset.compareTarget === saved.pair[1].id);
    trigger?.focus({ preventScroll:true });
    window.scrollTo({ top:saved.pageScroll, behavior:'instant' });
  }
  function open(pair, trigger) {
    if (session) close();
    const panel = element('dialog', '', 'ac-panel ac-floating');
    panel.setAttribute('aria-label', '双作品比较学习');
    session = { pair, trigger, panel, tab:'focus', views:new Map(),
      detailScroll:document.getElementById('detailPanel').scrollTop, pageScroll:window.scrollY, bodyOverflow:document.body.style.overflow };
    const toolbar = element('header', '', 'ac-toolbar');
    const back = element('button', '关闭对比 ×', 'ac-back');
    back.type = 'button';
    back.addEventListener('click', close);
    const title = element('h2', '比较学习');
    toolbar.append(title, back);
    panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
    const body = element('div', '', 'ac-scroll');
    const gallery = element('details', '', 'ac-gallery');
    gallery.open = true;
    gallery.append(element('summary', '作品图像 · 2件（点击收起 / 展开）'));
    const images = element('div', '', 'ac-images');
    gallery.append(images);
    const reading = element('section', '', 'ac-reading');
    const tabs = element('div', '', 'ac-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '双作品比较视角');
    const content = element('section', '', 'ac-content');
    content.id = 'ac-content';
    content.setAttribute('role', 'tabpanel');
    content.tabIndex = 0;
    const tabDefinitions = [['focus','比较重点'],['form','形式'],['function','功能'],['context','语境']];
    function activate(id, focus = false) {
      session.tab = id;
      tabs.querySelectorAll('button').forEach(button => {
        const active = button.dataset.tab === id;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
        if (active && focus) button.focus();
      });
      content.setAttribute('aria-labelledby', 'ac-tab-' + id);
      content.replaceChildren();
      if (id === 'focus') {
        const note = element('div', '', 'ac-note');
        note.append(element('h3', pair[0].comparisonNotes?.[pair[1].id]?.trim() ? '比较重点' : '观察方向'));
        bilingual(note, getComparisonNote(...pair, api.createComparisonAngle));
        content.append(note);
      } else {
        const columns = element('div', '', 'ac-columns');
        pair.forEach((work, index) => {
          const column = element('article');
          column.append(element('h3', `${index ? 'B' : 'A'} · ${work.titleZh}`));
          bilingual(column, work[id]);
          columns.append(column);
        });
        content.append(columns);
      }
    }
    tabDefinitions.forEach(([id, label], index) => {
      const button = element('button', label);
      button.type = 'button';
      button.id = 'ac-tab-' + id;
      button.dataset.tab = id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'ac-content');
      button.addEventListener('click', () => activate(id));
      button.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % 4;
        else if (event.key === 'ArrowLeft') next = (index + 3) % 4;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = 3;
        else return;
        event.preventDefault();
        activate(tabDefinitions[next][0], true);
      });
      tabs.append(button);
    });
    reading.append(tabs, content, element('p', '试着说出一个相似点和一个差异，并从作品中找到支持它的证据。', 'ac-hint'));
    body.append(gallery, reading);
    panel.append(toolbar, body);
    host.append(panel);
    host.classList.add('ac-is-open');
    filters.inert = true;
    workspace.inert = true;
    pair.forEach((work, side) => {
      const card = element('article', '', 'ac-art');
      card.append(element('p', `${side ? 'B · 对比作品' : 'A · 原作品'} · AP ${work.apNumber}`, 'ac-meta'));
      const heading = element('h3', work.titleZh);
      heading.append(element('span', work.titleEn, 'ac-title-en'));
      card.append(heading, element('p', `${work.artistCulture} · ${work.date}`, 'ac-meta'));
      const stage = element('div');
      const switcher = element('div', '', 'ac-views');
      const credits = element('div');
      const mediaItems = api.getArtworkImages(work).map(media => api.resolveMediaView(work, media));
      const creditItems = api.getArtworkImageCredits(work);
      function show(index) {
        session.views.set(work.id, index);
        const media = mediaItems[index];
        const credit = media.privateCredit || creditItems[index];
        stage.replaceChildren();
        if (!media.imageUrl || media.mediaStatus === 'rightsRestricted') {
          stage.append(api.createRightsPlaceholder(work, media));
        } else {
          const zoom = element('button', '', 'ac-image');
          zoom.type = 'button';
          zoom.setAttribute('aria-label', `查看${work.titleZh}大图`);
          const img = element('img');
          img.src = media.imageUrl;
          img.alt = media.imageAlt;
          api.installImageFallback(img, work);
          zoom.append(img, element('span', '查看大图 ↗', 'ac-zoom'));
          zoom.addEventListener('click', () => api.openImageDialog(work, media, credit, zoom));
          stage.append(zoom);
        }
        credits.replaceChildren();
        const disclosure = element('details', '', 'ac-credit');
        disclosure.append(element('summary', '图片出处与署名'), api.createImageCredit(media, credit));
        credits.append(disclosure);
        switcher.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      }
      if (mediaItems.length > 1) mediaItems.forEach((media, index) => {
        const button = element('button', `${index + 1} · ${media.label.split(' / ')[1] || media.label}`);
        button.type = 'button';
        button.addEventListener('click', () => show(index));
        switcher.append(button);
      });
      else switcher.append(element('span', '完整作品视图', 'ac-meta'));
      card.append(stage, switcher, credits);
      images.append(card);
      show(0);
    });
    activate('focus');
    document.body.style.overflow = 'hidden';
    panel.showModal();
    session.clearViewport = fitEmbeddedComparison(panel, window);
    back.focus({ preventScroll:true });
    // The module remains inside its course iframe; the shell navigation is untouched.
    // Native dialog keeps focus within the floating workspace.
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-compare-source][data-compare-target]');
    if (!trigger) return;
    const pair = getComparisonPair(api.ARTWORKS, trigger.dataset.compareSource, trigger.dataset.compareTarget);
    if (pair) open(pair, trigger);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && session && !document.getElementById('imageDialog').open) {
      event.preventDefault();
      close();
    }
  });
}

if (typeof document !== 'undefined' && window.ArtHistoryMap) mountComparisonStudy(document, window.ArtHistoryMap);

const comparisonFocus = {
 '128:129': {question:'同样是拥抱，亲密感如何被塑造？',common:'两件作品都用相拥的身体表现亲密关系。',a:['装饰性的包裹','金箔、矩形与圆形纹样，把两具身体包成一个轮廓。'],b:['体块上的合一','方形石块、互锁手臂与共享五官，把两个人压缩成整体。'],takeaway:'共同主题不变，材料与形式改变表达。',cues:['看金色表面：图案如何包裹身体','看石块轮廓：两个人如何合成一体']},
 '107:115': {question:'同样是斜卧裸体，观看关系有何不同？',common:'两件作品都重写了西方斜卧女性裸体的传统。',a:['理想化与异域想象','光滑轮廓、拉长的脊背、后宫物件，构成被想象的场景。'],b:['现代身份与直视','平坦笔触、正面直视、女仆献花，让观看联系具体的社会关系。'],takeaway:'从身体画法，读到观者与人物的关系。',cues:['看背部：比例为何被拉长','看目光：人物如何直视观者']},
 '135:139': {question:'同样是现代住宅，建筑如何回应场地？',common:'两者都是现代周末住宅，也都使用混凝土、玻璃与行进路线。',a:['工业化的建筑原则','架空柱、白色几何体与连续坡道，把现代生活组织成清晰系统。'],b:['与场地整合','悬挑板、当地石墙与溪谷岩石，把空间伸入特定地形。'],takeaway:'比较的是设计策略，而非“技术或自然”二选一。',cues:['看架空柱：建筑如何离开地面','看悬挑与石墙：建筑如何进入溪谷']},
 '1:2': {question:'同样画动物，观看方式有什么不同？',common:'两者都用动物轮廓组织史前图像，具体用途仍不能完全确定。',a:['可携带的图像','小型石片上的动物轮廓，让图像可以随物件移动。'],b:['固定的观看场所','大尺度洞壁、重叠兽群与不规则岩面，共同组织现场观看。'],takeaway:'先比较可见证据，不把仪式猜测当成事实。',cues:['看载体：一块可移动的小石片','看尺度：兽群如何沿洞壁展开']}
};

const comparisonTeaching = {
  "128:129": {
    "details": [
      [
        "材料与技法",
        "Klimt以油彩和金箔叠出闪亮表面，纹样吸引视线在画面上移动。",
        "Brancusi直接雕刻石材，保留近方形体量；切线和浅刻使人物从石块中显现。",
        "前者突出表面装饰，后者让材料的实体性参与表达。"
      ],
      [
        "身体如何结合",
        "男性的矩形纹样与女性的圆形纹样仍有区别，但金色衣袍把两人包入连续轮廓。",
        "两人的手臂、嘴和眼部彼此衔接，身体边界被压缩进同一块石体。",
        "Klimt通过包裹建立联系；Brancusi通过共用形状和紧密接合建立联系。"
      ],
      [
        "空间与观看",
        "金色背景削弱纵深，恋人像被悬置在装饰平面上；观者主要从正面阅读图像。",
        "立体石雕占据真实空间，侧面、轮廓和体块都影响身体关系的辨认。",
        "“亲密”不只是题材，也由平面图案或三维体量组织出来。"
      ]
    ],
    "prompt": "Compare how materials and formal choices shape the depiction of intimacy in Gustav Klimt’s The Kiss and Constantin Brancusi’s The Kiss. Support your comparison with specific visual evidence from both works.",
    "answer": [
      "Both Gustav Klimt’s The Kiss and Constantin Brancusi’s The Kiss depict intimacy through an embracing couple. However, Klimt develops the theme through decorative surfaces, whereas Brancusi emphasizes the physical unity of a carved block.",
      "In Klimt’s painting, gold leaf and dense patterns draw attention to the surface rather than a fully illusionistic setting. Rectangular motifs associated with the man contrast with rounded motifs associated with the woman, preserving differences between the figures. Nevertheless, the continuous golden covering encloses them within a shared contour. Intimacy is therefore expressed through both visual distinction and decorative enclosure.",
      "Brancusi instead retains the compact, approximately rectangular form of the stone. Interlocking arms and closely joined facial features compress the two bodies into an integrated mass. Unlike Klimt’s frontal, patterned image, the sculpture occupies actual space, making its contours and volume central to the encounter. The common theme thus depends on different formal strategies: a shared ornamental envelope in Klimt and a tightly joined sculptural body in Brancusi."
    ],
    "outline": "共同论点 → Klimt的金箔、纹样与包裹轮廓 → Brancusi的石块、接合身体与真实体量 → 回扣不同形式如何表达亲密。"
  },
  "107:115": {
    "details": [
      [
        "身体的处理",
        "Ingres以光滑明暗塑造肌肤，并拉长背部，使身体服从理想化曲线。",
        "Manet用较平坦的光色和较明确的轮廓，减少学院式柔和塑形。",
        "不要只写“写实或不写实”：两者都经过选择，但服务的观看方式不同。"
      ],
      [
        "目光与姿态",
        "女子背向观者而转头回看，身体被铺陈为带异域意味的视觉对象。",
        "Olympia正面直视观者，手部姿态及身体的正面呈现使观看关系更直接。",
        "两人都有回视；差别在回视与身体安排如何共同影响观看距离。"
      ],
      [
        "物件与社会语境",
        "烟斗、扇子和织物共同搭建想象的后宫，并非对真实“东方生活”的中性记录。",
        "女仆递来的花束及当代室内细节，使画面联系巴黎性交易与阶级、种族关系。",
        "从背景物件读出理想化异域想象与现代社会身份的区别。"
      ]
    ],
    "prompt": "Compare how Ingres’s La Grande Odalisque and Manet’s Olympia construct the relationship between the reclining nude and the viewer. Use formal and contextual evidence.",
    "answer": [
      "Ingres’s La Grande Odalisque and Manet’s Olympia both depict a reclining female nude, but they construct different relationships between the figure and the viewer. Ingres organizes an idealized, imagined setting, while Manet makes the encounter confrontational and socially specific.",
      "In La Grande Odalisque, smooth modeling and an elongated back emphasize a continuous, elegant contour. The figure turns her head toward the viewer, while luxurious textiles and objects associated with a harem frame the body within an Orientalist fantasy. These details should not be mistaken for a neutral record of an actual interior.",
      "In Olympia, flatter modeling and firmer contours challenge the softened bodily ideal familiar from academic painting. Olympia’s direct gaze and frontal presentation also make the viewer’s presence difficult to ignore. The maid’s bouquet and the contemporary setting connect the encounter to modern Parisian prostitution and unequal social relationships. Both women return the viewer’s gaze; the difference lies in how gaze, bodily treatment and setting work together. Manet uses the reclining-nude tradition to expose contemporary social relations rather than simply repeat an idealized fantasy."
    ],
    "outline": "先点共同姿态 → 比身体处理 → 比目光与物件 → 说明形式如何连接不同社会语境。"
  },
  "135:139": {
    "details": [
      [
        "建筑与地面的关系",
        "Villa Savoye用架空柱抬起白色主体，强调建筑几何与下方地面的区分。",
        "Fallingwater让水平悬挑伸向溪谷，并以当地石墙和原有岩体建立联系。",
        "一者突出独立的几何系统，另一者强调与特定地形相接；不是完全脱离或完全融入的绝对对立。"
      ],
      [
        "材料与表面",
        "白色表面、水平长窗和规则体量，使工业化建筑原则具有清晰可辨的形式。",
        "平滑混凝土板与粗糙石墙并置，强化水平延伸及不同材料的触感。",
        "两者都用现代技术，但材料的组合产生不同的场地经验。"
      ],
      [
        "身体如何移动",
        "连续坡道串联楼层与屋顶花园，把行进安排成一种建筑漫游。",
        "平台、室内外延伸和向溪谷展开的空间，让移动不断联系周围景观。",
        "比较的不是“有没有自然”，而是设计如何组织人与自然、建筑之间的关系。"
      ]
    ],
    "prompt": "Compare how Villa Savoye and Fallingwater use form, materials and circulation to relate a modern residence to its site.",
    "answer": [
      "Villa Savoye and Fallingwater both use modern materials and carefully organized movement to create a weekend residence. Their relationship to the site, however, develops through different combinations of geometry, structure and surface.",
      "At Villa Savoye, slender pilotis raise the white principal volume above the ground. Horizontal windows and the clear geometric envelope emphasize a coherent architectural system. A continuous ramp connects different levels and the roof garden, making movement through the house a deliberate architectural experience. The building’s relationship to nature therefore includes framed views and an organized route, rather than an absence of engagement with its surroundings.",
      "Fallingwater uses projecting concrete terraces, local stone walls and existing rock to establish a more visibly site-specific composition. Smooth horizontal slabs contrast with rough masonry, while interior and exterior spaces extend toward the stream and wooded landscape. Both houses depend on modern engineering, but they make its presence legible differently. Villa Savoye foregrounds an ordered geometric framework; Fallingwater combines engineered projections with the textures and contours of its particular setting."
    ],
    "outline": "共同类型与技术 → Villa Savoye的架空、几何、坡道 → Fallingwater的悬挑、石墙、场地 → 避免“技术对自然”的简单二分。"
  },
  "1:2": {
    "details": [
      [
        "载体与移动性",
        "Apollo 11 stones把动物画在小型石片上，图像可以随物件移动。",
        "Great Hall of the Bulls的图像附着于洞穴岩壁，观看需发生在固定场所。",
        "比较可移动物与场所图像，不进一步假定石片确实被用于某种特定仪式。"
      ],
      [
        "尺度与构图",
        "小石片以概括的动物轮廓形成集中形象，载体限制了图像范围。",
        "大尺度兽群沿不规则洞壁展开，重叠和不同侧面的特征增加视觉层次。",
        "尺度改变观看范围及身体距离；不能仅由“大”推断更高社会等级。"
      ],
      [
        "可见证据与功能解释",
        "动物形象和石质载体可以辨认，但具体原始用途仍无定论。",
        "洞壁位置、动物重叠和岩面关系可观察，狩猎或仪式功能仍是解释。",
        "两件作品都应区分“我们看到了什么”与“我们据此推测什么”。"
      ]
    ],
    "prompt": "Compare how support, scale and location shape the viewing of Apollo 11 stones and the Great Hall of the Bulls. Distinguish visual evidence from uncertain interpretations of function.",
    "answer": [
      "Apollo 11 stones and the Great Hall of the Bulls both use recognizable animal imagery, but their supports and locations create different possibilities for viewing. Their shared subject matter does not establish an identical original function.",
      "The Apollo 11 images appear on small stone fragments. Concentrated animal contours fit within a limited surface, and the support is physically portable. This makes movement of the image possible, although it does not prove how or why prehistoric people actually transported or used the stones.",
      "At Lascaux, large animals extend across fixed, irregular cave walls. Overlapping forms and the combination of different views of animal bodies organize a broader visual field. Encountering these paintings requires entering their location, so the cave surface and the viewer’s bodily position are integral to the experience. The strongest comparison therefore concerns portable versus place-bound images and concentrated versus expansive compositions. Ritual, hunting-related and other interpretations may be discussed as possibilities, but none should be presented as a securely established purpose shared by both works."
    ],
    "outline": "共同动物题材 → 石片载体与可移动性 → 洞壁、尺度与构图 → 将功能推测和可见证据分开。"
  }
};

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
    workspace.style.display = saved.workspaceDisplay;
    saved.panel.remove();
    document.body.style.overflow = saved.bodyOverflow;
    filters.inert = false;
    workspace.inert = false;
    host.classList.remove('ac-is-open','has-prototype-comparison');
    document.getElementById('detailPanel').scrollTop = saved.detailScroll;
    const trigger = saved.trigger.isConnected ? saved.trigger : [...document.querySelectorAll('[data-compare-target]')]
      .find(button => button.dataset.compareSource === saved.pair[0].id && button.dataset.compareTarget === saved.pair[1].id);
    trigger?.focus({ preventScroll:true });
    window.scrollTo({ top:saved.pageScroll, behavior:'instant' });
  }
  function open(pair, trigger) {
    if (session) close();
    const panel = element('section', '', 'ac-panel ac-integrated');
    panel.setAttribute('aria-label', '双作品比较学习');
    session = { pair, trigger, panel, tab:'focus', views:new Map(),
      detailScroll:document.getElementById('detailPanel').scrollTop, pageScroll:window.scrollY, bodyOverflow:document.body.style.overflow, workspaceDisplay:workspace.style.display };
    const toolbar = element('header', '', 'ac-toolbar');
    const back = element('button', '← 返回作品', 'ac-back');
    back.type = 'button';
    back.addEventListener('click', close);
    const title = element('h2', '比较学习');
    const titleGroup=element('div','','ac-heading-group');
    titleGroup.append(element('span','作品对比','ac-kicker'),title);
    title.textContent='Comparison';
    const examples=element('label','','ac-examples');examples.append(element('span','比较组合'));
    const select=element('select');select.setAttribute('aria-label','比较组合');
    for(const [a,b,label] of [[128,129,'The Kiss · Klimt / Brancusi'],[107,115,'La Grande Odalisque / Olympia'],[135,139,'Villa Savoye / Fallingwater'],[1,2,'Apollo 11 stones / Lascaux']]){
      const option=element('option',label);option.value=a+':'+b;option.selected=pair[0].apNumber===a;select.append(option);
    }
    if(![[128,129],[107,115],[135,139],[1,2]].some(([a,b])=>pair[0].apNumber===a&&pair[1].apNumber===b)){
      const current=element('option',pair[0].titleEn+' / '+pair[1].titleEn);current.value=pair[0].apNumber+':'+pair[1].apNumber;select.prepend(current);current.selected=true;
    }
    select.addEventListener('change',()=>showExample(...select.value.split(':').map(Number)));
    examples.append(select);toolbar.append(back,titleGroup,examples);
    panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
    const body = element('div', '', 'ac-scroll');
    const gallery = element('details', '', 'ac-gallery');
    gallery.open = true;
    gallery.append(element('summary', '作品图像 · 2件（点击收起 / 展开）'));
    const images = element('div', '', 'ac-images');
    gallery.append(images);
    const reading = element('section', '', 'ac-reading');
    const focusInfo=comparisonFocus[pair[0].apNumber+':'+pair[1].apNumber];
    const teaching=comparisonTeaching[pair[0].apNumber+':'+pair[1].apNumber];
    const tabs = element('div', '', 'ac-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', '双作品比较视角');
    const content = element('section', '', 'ac-content');
    content.id = 'ac-content';
    content.setAttribute('role', 'tabpanel');
    content.tabIndex = 0;
    const tabDefinitions = [['focus','比较分析'],['answer','示范答案']];
    const readingPositions=new Map();let currentReadingTab=null;let openAngles=new Set([0]);
    const questionHead=element('header','','ac-reader-head');
    questionHead.append(element('span','本组比较问题','ac-label'),element('h3',focusInfo?.question||'这两件作品有哪些值得解释的相同点与差异？','ac-fixed-question'));
    if(teaching){
      const english=element('div','','ac-question-english');english.append(element('span','PROMPT','ac-label'),element('p',teaching.prompt));questionHead.append(english);
    }
    function activate(id, focus = false) {
      if(currentReadingTab){
        readingPositions.set(currentReadingTab,content.scrollTop);
        if(currentReadingTab==='focus')openAngles=new Set([...content.querySelectorAll('[data-comparison-angle]')].filter(x=>x.open).map(x=>Number(x.dataset.comparisonAngle)));
      }
      currentReadingTab=id;
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
        if(focusInfo){
          const focus=element('div','','ac-focus');

          const common=element('div','','ac-common');common.append(element('span','共同点','ac-label'),element('p',focusInfo.common));focus.append(common);
          focus.append(element('h4','关键差异','ac-difference-title'),element('p','3 个比较角度 · 点击展开 A/B 证据与解释','ac-analysis-help'));
          if(teaching)teaching.details.forEach((detail,index)=>{
            const block=element('details','','ac-detailed-difference');block.dataset.comparisonAngle=String(index);block.open=openAngles.has(index);
            const summary=element('summary','','ac-angle-summary');summary.append(element('span',String(index+1).padStart(2,'0'),'ac-angle-number'),element('strong',detail[0]));block.append(summary);
            for(let side=0;side<2;side++){
              const row=element('div','','ac-evidence-line');row.append(element('span',side?'B':'A','ac-letter'),element('p',detail[side+1]));block.append(row);
            }
            block.append(element('p','比较解释 · '+detail[3],'ac-explain'));focus.append(block);
          });
          else for(const [index,side]of [focusInfo.a,focusInfo.b].entries()){
            const block=element('article','','ac-evidence ac-evidence-'+index);
            const head=element('div','','ac-evidence-head');head.append(element('span',index?'B':'A','ac-letter'),element('strong',side[0]));
            block.append(head,element('p',side[1]));focus.append(block);
          }
          const takeaway=element('div','','ac-takeaway');takeaway.append(element('span','这组比较的重点','ac-label'),element('strong',focusInfo.takeaway));focus.append(takeaway);

          content.append(focus);
        }else{
          const note = element('div', '', 'ac-note');
          note.append(element('h3','比较分析'));
          bilingual(note, getComparisonNote(...pair, api.createComparisonAngle));content.append(note);
        }
      } else if(id==='answer'){
        const answer=element('article','','ac-model-answer');
        answer.append(element('span','教学示范 · 非官方答案','ac-label'),element('h3','Model Answer'),element('p','先看比较论点，再看两件作品的证据怎样支持解释。','ac-model-guide'));
        if(teaching){

          const count=teaching.answer.join(' ').trim().split(/\s+/).length;
          answer.append(element('span',count+' words · English','ac-answer-meta'));
          teaching.answer.forEach((paragraph,index)=>{
            const passage=element('section','','ac-answer-passage');
            const labels=['比较论点','A 的作品证据与解释','B 的作品证据与比较'];
            passage.append(element('h4',labels[index]||'回扣比较','ac-answer-role'),element('p',paragraph,'ac-model-paragraph'));answer.append(passage);
          });
          const outline=element('details','','ac-answer-outline');outline.append(element('summary','查看中文答题结构'),element('p',teaching.outline));answer.append(outline);
        }else{answer.append(element('p','这组暂未编写示范答案，请先从比较重点中选取证据。'));}
        content.append(answer);
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
      content.scrollTop=readingPositions.get(id)||0;
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
        if (event.key === 'ArrowRight') next = (index + 1) % tabDefinitions.length;
        else if (event.key === 'ArrowLeft') next = (index + tabDefinitions.length - 1) % tabDefinitions.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabDefinitions.length - 1;
        else return;
        event.preventDefault();
        activate(tabDefinitions[next][0], true);
      });
      tabs.append(button);
    });
    reading.append(questionHead,tabs,content);
    body.append(gallery, reading);
    panel.append(toolbar, body);
    host.append(panel);
    host.classList.add('ac-is-open');
    workspace.style.display = 'none';
    host.classList.add('has-prototype-comparison');
    pair.forEach((work, side) => {
      const card = element('article', '', 'ac-art');
      card.append(element('p', `${side ? 'B · 对比作品' : 'A · 原作品'} · AP ${work.apNumber}`, 'ac-meta'));
      const heading = element('h3', work.titleEn);
      heading.append(element('span', work.titleZh, 'ac-title-en'));
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
          zoom.setAttribute('aria-label', `查看 ${side ? 'B' : 'A'} · ${work.titleEn} · ${work.artistCulture} 大图`);
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
      card.append(stage);
      if(focusInfo)card.append(element('p',focusInfo.cues[side],'ac-look-cue'));
      card.append(switcher, credits);
      images.append(card);
      show(0);
    });
    activate('focus');
    panel.tabIndex=-1;
    panel.setAttribute('role','region');

    back.focus({ preventScroll:true });
    // The module remains inside its course iframe; the shell navigation is untouched.
    // Comparison stays in the course flow and returns to the original artwork.
  }
  filters.addEventListener('change',()=>{if(session)close();});
  filters.addEventListener('input',()=>{if(session)close();});
  document.addEventListener('click', event => {
    if(event.target.closest?.('[data-learning-mode]')&&session)close();
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
  function showExample(a,b){
    if(session)close();
    const first=api.ARTWORKS.find(w=>w.apNumber===a),second=api.ARTWORKS.find(w=>w.apNumber===b);
    const pair=getComparisonPair(api.ARTWORKS,first.id,second.id);
    api.selectUnit(String(first.unit));api.selectArtwork(first.id,undefined,true);
    api.state.activeDetailTab='compare';api.render();
    const trigger=[...document.querySelectorAll('[data-compare-source][data-compare-target]')].find(x=>x.dataset.compareSource===first.id&&x.dataset.compareTarget===second.id)||document.getElementById('detailTitle');
    open(pair,trigger);
  }
  // Embedded preview opens through each artwork’s comparison control.
}

if (typeof document !== 'undefined' && window.ArtHistoryMap) mountComparisonStudy(document, window.ArtHistoryMap);

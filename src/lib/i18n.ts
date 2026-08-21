import { derived, writable } from 'svelte/store';

export const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'zh', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ur', name: 'اردو' },
  { code: 'pl', name: 'Polski' },
] as const;

export type Locale = (typeof languages)[number]['code'];
type Params = Record<string, string | number>;
type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type PluralMessage = Partial<Record<PluralCategory, string>> & { other: string };
type Message = string | PluralMessage;

const en = {
  'meta.title': 'klex — text overlays for video',
  'brand.home': 'Go to start',
  'brand.tagline': 'video overlays',
  'language.label': 'Language',
  'layer.count': { one: '{count} layer', other: '{count} layers' },
  'header.export': 'Export',
  'steps.label': 'Project steps',
  'steps.video': 'Video',
  'steps.overlays': 'Text',
  'steps.export': 'Export',
  'hero.eyebrow': 'Text overlay editor',
  'hero.before': 'Add',
  'hero.emphasis': 'expressive',
  'hero.after': 'text right in your browser.',
  'hero.subtitle': 'Your video is never uploaded to a server.',
  'upload.checking': 'Checking video…',
  'upload.drop': 'Drop your video here',
  'upload.checkingHint': 'Codec, duration and resolution',
  'upload.selectHint': 'or click to choose a file',
  'upload.upTo4k': 'up to 4K',
  'upload.limit': 'up to {seconds}s per export',
  'privacy.title': 'Your video stays with you',
  'privacy.body': 'Processing happens locally in your browser.',
  'editor.step': 'Step 2 of 3',
  'editor.description': 'Set the timing, style and position of every layer.',
  'editor.addOverlay': 'Add text',
  'editor.overlays': 'Text overlays',
  'editor.noText': 'No text',
  'editor.removeNamed': 'Remove “{name}”',
  'editor.composition': 'Composition',
  'editor.layers': 'Layers',
  'editor.addLayer': 'Add layer',
  'editor.seconds': '{value}s',
  'editor.replaceVideo': 'Replace video',
  'editor.previewReady': 'Preview ready',
  'editor.previewPreparing': 'Preparing preview…',
  'export.finalStep': 'Final step',
  'export.ready': 'Ready to export',
  'export.description': 'Review the settings. Rendering happens locally, so your video stays private.',
  'export.file': 'File',
  'export.clip': 'Clip',
  'export.composition': 'Composition',
  'export.quality': 'Quality',
  'export.chooseSize': 'Choose a size',
  'export.high': 'High',
  'export.highDetail': 'Up to 1080p · 12 Mbps',
  'export.best': 'Best',
  'export.standard': 'Standard',
  'export.standardDetail': 'Up to 1080p · 8 Mbps',
  'export.balance': 'Balanced',
  'export.light': 'Light',
  'export.lightDetail': 'Up to 720p · 4 Mbps',
  'export.fast': 'Fast',
  'export.saved': 'File saved. You can export it again.',
  'export.button': 'Export MP4',
  'export.retry': 'Retry in light mode',
  'export.back': 'Back to editor',
  'trim.required': 'Trim required',
  'trim.tooLong': 'The video is too long',
  'trim.choose': 'Choose a clip up to {seconds} seconds long to continue.',
  'progress.label': 'Export',
  'progress.rendering': 'Rendering video',
  'progress.composing': 'Building composition',
  'progress.elapsed': '{seconds}s · do not close this tab',
  'common.cancel': 'Cancel',
  'inspector.content': 'Content',
  'inspector.caption': 'Text overlay',
  'inspector.delete': 'Delete',
  'inspector.deleteLayer': 'Delete layer',
  'inspector.text': 'Text',
  'inspector.appearance': 'Appearance',
  'inspector.typography': 'Typography',
  'inspector.typeface': 'Typeface',
  'font.sans': 'Sans',
  'font.serif': 'Serif',
  'font.mono': 'Mono',
  'inspector.size': 'Size',
  'inspector.textColor': 'Text color',
  'style.plate': 'Plate',
  'style.stroke': 'Stroke',
  'style.fadeIn': 'Fade in',
  'style.fadeOut': 'Fade out',
  'style.alignment': 'Alignment',
  'stage.preview': 'Preview',
  'stage.activeText': 'Active overlay text',
  'stage.move': 'Move overlay',
  'stage.editStyle': 'Edit style',
  'stage.selectLayer': 'Select layer “{name}”',
  'stage.captionStyle': 'Overlay style',
  'style.color': 'Color',
  'style.text': 'Text',
  'style.changeColor': 'Change color: {target}',
  'style.chooseColor': 'Choose a color',
  'style.font': 'Font',
  'stage.pause': 'Pause',
  'stage.play': 'Play',
  'stage.trimRequired': 'Trim mode is required',
  'stage.cancelTrim': 'Cancel trimming',
  'stage.trimVideo': 'Trim video',
  'stage.trim': 'Trim',
  'stage.in': 'In',
  'stage.out': 'Out',
  'stage.clipStart': 'Clip start',
  'stage.clipEnd': 'Clip end',
  'stage.maxDuration': 'No more than {seconds}s',
  'stage.apply': 'Apply',
  'stage.playhead': 'Playhead',
  'stage.currentTime': 'Current video time',
  'stage.caption': 'Overlay',
  'stage.start': 'Start',
  'stage.stop': 'Stop',
  'stage.captionStart': 'Overlay start',
  'stage.captionEnd': 'Overlay end',
  'error.webCodecs': 'This browser does not support WebCodecs.',
  'error.container': 'Only MP4 and MOV containers are supported.',
  'error.noVideo': 'The selected file has no video track.',
  'error.videoCodec': 'This video codec is not supported by the browser.',
  'error.resolution': 'Video resolution exceeds the 4K limit (3840 px on the longest side).',
  'error.duration': 'Could not determine the video duration.',
  'error.audio': 'The audio codec is not AAC-LC; the export will have no sound.',
  'error.capabilities': 'This browser does not support WebCodecs or OffscreenCanvas.',
  'error.decoder': 'Could not get the video decoder configuration.',
  'error.encoder': 'No suitable H.264 encoder is available in this browser.',
  'error.generic': 'The export could not be completed.',
} as const satisfies Record<string, Message>;

type BaseMessageKey = keyof typeof en | 'error.storage';
type BaseMessages = Record<keyof typeof en, Message>;

const es: BaseMessages = {
  'meta.title': 'klex — textos sobre vídeo', 'brand.home': 'Ir al inicio', 'brand.tagline': 'textos en vídeo', 'language.label': 'Idioma',
  'layer.count': { one: '{count} capa', other: '{count} capas' }, 'header.export': 'Exportar', 'steps.label': 'Pasos del proyecto', 'steps.video': 'Vídeo', 'steps.overlays': 'Textos', 'steps.export': 'Exportar',
  'hero.eyebrow': 'Editor de textos', 'hero.before': 'Añade textos', 'hero.emphasis': 'expresivos', 'hero.after': 'directamente en tu navegador.', 'hero.subtitle': 'Tu vídeo nunca se sube a un servidor.',
  'upload.checking': 'Comprobando vídeo…', 'upload.drop': 'Suelta tu vídeo aquí', 'upload.checkingHint': 'Códec, duración y resolución', 'upload.selectHint': 'o haz clic para elegir un archivo', 'upload.upTo4k': 'hasta 4K', 'upload.limit': 'hasta {seconds}s por exportación',
  'privacy.title': 'Tu vídeo se queda contigo', 'privacy.body': 'El procesamiento ocurre localmente en tu navegador.',
  'editor.step': 'Paso 2 de 3', 'editor.description': 'Ajusta el tiempo, estilo y posición de cada capa.', 'editor.addOverlay': 'Añadir texto', 'editor.overlays': 'Textos', 'editor.noText': 'Sin texto', 'editor.removeNamed': 'Eliminar “{name}”', 'editor.composition': 'Composición', 'editor.layers': 'Capas', 'editor.addLayer': 'Añadir capa', 'editor.seconds': '{value}s', 'editor.replaceVideo': 'Cambiar vídeo', 'editor.previewReady': 'Vista previa lista', 'editor.previewPreparing': 'Preparando vista previa…',
  'export.finalStep': 'Paso final', 'export.ready': 'Listo para exportar', 'export.description': 'Revisa los ajustes. El renderizado es local y tu vídeo permanece privado.', 'export.file': 'Archivo', 'export.clip': 'Fragmento', 'export.composition': 'Composición', 'export.quality': 'Calidad', 'export.chooseSize': 'Elige un tamaño', 'export.high': 'Alta', 'export.highDetail': 'Hasta 1080p · 12 Mbps', 'export.best': 'Mejor', 'export.standard': 'Normal', 'export.standardDetail': 'Hasta 1080p · 8 Mbps', 'export.balance': 'Equilibrio', 'export.light': 'Ligera', 'export.lightDetail': 'Hasta 720p · 4 Mbps', 'export.fast': 'Rápida', 'export.saved': 'Archivo guardado. Puedes exportarlo de nuevo.', 'export.button': 'Exportar MP4', 'export.retry': 'Reintentar en modo ligero', 'export.back': 'Volver al editor',
  'trim.required': 'Se requiere recorte', 'trim.tooLong': 'El vídeo es demasiado largo', 'trim.choose': 'Elige un fragmento de hasta {seconds} segundos para continuar.', 'progress.label': 'Exportación', 'progress.rendering': 'Renderizando vídeo', 'progress.composing': 'Creando composición', 'progress.elapsed': '{seconds}s · no cierres esta pestaña', 'common.cancel': 'Cancelar',
  'inspector.content': 'Contenido', 'inspector.caption': 'Texto', 'inspector.delete': 'Eliminar', 'inspector.deleteLayer': 'Eliminar capa', 'inspector.text': 'Texto', 'inspector.appearance': 'Aspecto', 'inspector.typography': 'Tipografía', 'inspector.typeface': 'Fuente', 'font.sans': 'Sans', 'font.serif': 'Serif', 'font.mono': 'Mono', 'inspector.size': 'Tamaño', 'inspector.textColor': 'Color del texto', 'style.plate': 'Placa', 'style.stroke': 'Contorno', 'style.fadeIn': 'Aparición suave', 'style.fadeOut': 'Desvanecimiento', 'style.alignment': 'Alineación',
  'stage.preview': 'Vista previa', 'stage.activeText': 'Texto activo', 'stage.move': 'Mover texto', 'stage.editStyle': 'Editar estilo', 'stage.selectLayer': 'Seleccionar capa “{name}”', 'stage.captionStyle': 'Estilo del texto', 'style.color': 'Color', 'style.text': 'Texto', 'style.changeColor': 'Cambiar color: {target}', 'style.chooseColor': 'Elige un color', 'style.font': 'Fuente', 'stage.pause': 'Pausar', 'stage.play': 'Reproducir', 'stage.trimRequired': 'El modo de recorte es obligatorio', 'stage.cancelTrim': 'Cancelar recorte', 'stage.trimVideo': 'Recortar vídeo', 'stage.trim': 'Recorte', 'stage.in': 'Entrada', 'stage.out': 'Salida', 'stage.clipStart': 'Inicio del fragmento', 'stage.clipEnd': 'Fin del fragmento', 'stage.maxDuration': 'Máximo {seconds}s', 'stage.apply': 'Aplicar', 'stage.playhead': 'Cursor', 'stage.currentTime': 'Momento actual del vídeo', 'stage.caption': 'Texto', 'stage.start': 'Inicio', 'stage.stop': 'Fin', 'stage.captionStart': 'Inicio del texto', 'stage.captionEnd': 'Fin del texto',
  'error.webCodecs': 'Este navegador no admite WebCodecs.', 'error.container': 'Solo se admiten contenedores MP4 y MOV.', 'error.noVideo': 'El archivo seleccionado no tiene pista de vídeo.', 'error.videoCodec': 'El navegador no admite este códec de vídeo.', 'error.resolution': 'La resolución supera el límite 4K (3840 px en el lado mayor).', 'error.duration': 'No se pudo determinar la duración del vídeo.', 'error.audio': 'El códec de audio no es AAC-LC; la exportación no tendrá sonido.', 'error.capabilities': 'Este navegador no admite WebCodecs u OffscreenCanvas.', 'error.decoder': 'No se pudo obtener la configuración del decodificador.', 'error.encoder': 'No hay un codificador H.264 compatible en este navegador.', 'error.generic': 'No se pudo completar la exportación.',
};

const zh: BaseMessages = {
  'meta.title': 'klex — 视频文字叠加', 'brand.home': '返回首页', 'brand.tagline': '视频文字叠加', 'language.label': '语言',
  'layer.count': { other: '{count} 个图层' }, 'header.export': '导出', 'steps.label': '项目步骤', 'steps.video': '视频', 'steps.overlays': '文字', 'steps.export': '导出',
  'hero.eyebrow': '文字叠加编辑器', 'hero.before': '在浏览器中添加', 'hero.emphasis': '生动的', 'hero.after': '视频文字。', 'hero.subtitle': '视频不会上传到服务器。',
  'upload.checking': '正在检查视频…', 'upload.drop': '将视频拖到这里', 'upload.checkingHint': '编解码器、时长和分辨率', 'upload.selectHint': '或点击选择文件', 'upload.upTo4k': '最高 4K', 'upload.limit': '每次导出最长 {seconds} 秒',
  'privacy.title': '视频始终留在您的设备上', 'privacy.body': '所有处理都在浏览器本地完成。',
  'editor.step': '第 2 步，共 3 步', 'editor.description': '设置每个图层的时间、样式和位置。', 'editor.addOverlay': '添加文字', 'editor.overlays': '文字叠加', 'editor.noText': '无文字', 'editor.removeNamed': '删除“{name}”', 'editor.composition': '合成', 'editor.layers': '图层', 'editor.addLayer': '添加图层', 'editor.seconds': '{value}秒', 'editor.replaceVideo': '更换视频', 'editor.previewReady': '预览已就绪', 'editor.previewPreparing': '正在准备预览…',
  'export.finalStep': '最后一步', 'export.ready': '可以导出', 'export.description': '请检查设置。渲染在本地进行，视频保持私密。', 'export.file': '文件', 'export.clip': '片段', 'export.composition': '合成', 'export.quality': '质量', 'export.chooseSize': '选择尺寸', 'export.high': '高', 'export.highDetail': '最高 1080p · 12 Mbps', 'export.best': '最佳', 'export.standard': '标准', 'export.standardDetail': '最高 1080p · 8 Mbps', 'export.balance': '均衡', 'export.light': '轻量', 'export.lightDetail': '最高 720p · 4 Mbps', 'export.fast': '快速', 'export.saved': '文件已保存，可以再次导出。', 'export.button': '导出 MP4', 'export.retry': '以轻量模式重试', 'export.back': '返回编辑器',
  'trim.required': '需要裁剪', 'trim.tooLong': '视频太长', 'trim.choose': '请选择不超过 {seconds} 秒的片段以继续。', 'progress.label': '导出', 'progress.rendering': '正在渲染视频', 'progress.composing': '正在生成合成内容', 'progress.elapsed': '{seconds}秒 · 请勿关闭此标签页', 'common.cancel': '取消',
  'inspector.content': '内容', 'inspector.caption': '文字叠加', 'inspector.delete': '删除', 'inspector.deleteLayer': '删除图层', 'inspector.text': '文字', 'inspector.appearance': '外观', 'inspector.typography': '排版', 'inspector.typeface': '字体类型', 'font.sans': '无衬线', 'font.serif': '衬线', 'font.mono': '等宽', 'inspector.size': '大小', 'inspector.textColor': '文字颜色', 'style.plate': '底板', 'style.stroke': '描边', 'style.fadeIn': '淡入', 'style.fadeOut': '淡出', 'style.alignment': '对齐',
  'stage.preview': '预览', 'stage.activeText': '当前叠加文字', 'stage.move': '移动文字', 'stage.editStyle': '编辑样式', 'stage.selectLayer': '选择图层“{name}”', 'stage.captionStyle': '文字样式', 'style.color': '颜色', 'style.text': '文字', 'style.changeColor': '更改颜色：{target}', 'style.chooseColor': '选择颜色', 'style.font': '字体', 'stage.pause': '暂停', 'stage.play': '播放', 'stage.trimRequired': '必须使用裁剪模式', 'stage.cancelTrim': '取消裁剪', 'stage.trimVideo': '裁剪视频', 'stage.trim': '裁剪', 'stage.in': '入点', 'stage.out': '出点', 'stage.clipStart': '片段开始', 'stage.clipEnd': '片段结束', 'stage.maxDuration': '不超过 {seconds} 秒', 'stage.apply': '应用', 'stage.playhead': '播放头', 'stage.currentTime': '当前视频时间', 'stage.caption': '文字', 'stage.start': '开始', 'stage.stop': '结束', 'stage.captionStart': '文字开始', 'stage.captionEnd': '文字结束',
  'error.webCodecs': '此浏览器不支持 WebCodecs。', 'error.container': '仅支持 MP4 和 MOV 容器。', 'error.noVideo': '所选文件没有视频轨道。', 'error.videoCodec': '浏览器不支持此视频编解码器。', 'error.resolution': '视频分辨率超过 4K 限制（长边 3840 px）。', 'error.duration': '无法确定视频时长。', 'error.audio': '音频编解码器不是 AAC-LC；导出将没有声音。', 'error.capabilities': '此浏览器不支持 WebCodecs 或 OffscreenCanvas。', 'error.decoder': '无法获取视频解码器配置。', 'error.encoder': '此浏览器没有可用的 H.264 编码器。', 'error.generic': '无法完成导出。',
};

const hi: BaseMessages = {
  'meta.title': 'klex — वीडियो पर टेक्स्ट', 'brand.home': 'शुरुआत पर जाएँ', 'brand.tagline': 'वीडियो टेक्स्ट', 'language.label': 'भाषा',
  'layer.count': { one: '{count} लेयर', other: '{count} लेयर' }, 'header.export': 'एक्सपोर्ट', 'steps.label': 'प्रोजेक्ट के चरण', 'steps.video': 'वीडियो', 'steps.overlays': 'टेक्स्ट', 'steps.export': 'एक्सपोर्ट',
  'hero.eyebrow': 'टेक्स्ट ओवरले एडिटर', 'hero.before': 'ब्राउज़र में ही', 'hero.emphasis': 'अभिव्यंजक', 'hero.after': 'टेक्स्ट जोड़ें।', 'hero.subtitle': 'आपका वीडियो सर्वर पर अपलोड नहीं होता।',
  'upload.checking': 'वीडियो जाँचा जा रहा है…', 'upload.drop': 'वीडियो यहाँ छोड़ें', 'upload.checkingHint': 'कोडेक, अवधि और रिज़ॉल्यूशन', 'upload.selectHint': 'या फ़ाइल चुनने के लिए क्लिक करें', 'upload.upTo4k': '4K तक', 'upload.limit': 'हर एक्सपोर्ट में {seconds} सेकंड तक',
  'privacy.title': 'वीडियो आपके पास रहता है', 'privacy.body': 'प्रोसेसिंग आपके ब्राउज़र में स्थानीय रूप से होती है।',
  'editor.step': '3 में से चरण 2', 'editor.description': 'हर लेयर का समय, शैली और स्थान तय करें।', 'editor.addOverlay': 'टेक्स्ट जोड़ें', 'editor.overlays': 'टेक्स्ट ओवरले', 'editor.noText': 'कोई टेक्स्ट नहीं', 'editor.removeNamed': '“{name}” हटाएँ', 'editor.composition': 'कंपोज़िशन', 'editor.layers': 'लेयर', 'editor.addLayer': 'लेयर जोड़ें', 'editor.seconds': '{value}से', 'editor.replaceVideo': 'वीडियो बदलें', 'editor.previewReady': 'प्रीव्यू तैयार', 'editor.previewPreparing': 'प्रीव्यू तैयार हो रहा है…',
  'export.finalStep': 'अंतिम चरण', 'export.ready': 'एक्सपोर्ट के लिए तैयार', 'export.description': 'सेटिंग जाँचें। रेंडरिंग स्थानीय है, इसलिए वीडियो निजी रहता है।', 'export.file': 'फ़ाइल', 'export.clip': 'क्लिप', 'export.composition': 'कंपोज़िशन', 'export.quality': 'गुणवत्ता', 'export.chooseSize': 'आकार चुनें', 'export.high': 'उच्च', 'export.highDetail': '1080p तक · 12 Mbps', 'export.best': 'सर्वश्रेष्ठ', 'export.standard': 'मानक', 'export.standardDetail': '1080p तक · 8 Mbps', 'export.balance': 'संतुलित', 'export.light': 'हल्का', 'export.lightDetail': '720p तक · 4 Mbps', 'export.fast': 'तेज़', 'export.saved': 'फ़ाइल सेव हुई। फिर से एक्सपोर्ट कर सकते हैं।', 'export.button': 'MP4 एक्सपोर्ट करें', 'export.retry': 'हल्के मोड में फिर प्रयास करें', 'export.back': 'एडिटर पर लौटें',
  'trim.required': 'ट्रिम करना ज़रूरी है', 'trim.tooLong': 'वीडियो बहुत लंबा है', 'trim.choose': 'जारी रखने के लिए {seconds} सेकंड तक की क्लिप चुनें।', 'progress.label': 'एक्सपोर्ट', 'progress.rendering': 'वीडियो रेंडर हो रहा है', 'progress.composing': 'कंपोज़िशन बन रही है', 'progress.elapsed': '{seconds}से · यह टैब बंद न करें', 'common.cancel': 'रद्द करें',
  'inspector.content': 'सामग्री', 'inspector.caption': 'टेक्स्ट ओवरले', 'inspector.delete': 'हटाएँ', 'inspector.deleteLayer': 'लेयर हटाएँ', 'inspector.text': 'टेक्स्ट', 'inspector.appearance': 'रूप', 'inspector.typography': 'टाइपोग्राफी', 'inspector.typeface': 'टाइपफेस', 'font.sans': 'सैन्स', 'font.serif': 'सेरिफ़', 'font.mono': 'मोनो', 'inspector.size': 'आकार', 'inspector.textColor': 'टेक्स्ट रंग', 'style.plate': 'प्लेट', 'style.stroke': 'आउटलाइन', 'style.fadeIn': 'फ़ेड इन', 'style.fadeOut': 'फ़ेड आउट', 'style.alignment': 'संरेखण',
  'stage.preview': 'प्रीव्यू', 'stage.activeText': 'सक्रिय ओवरले टेक्स्ट', 'stage.move': 'ओवरले खिसकाएँ', 'stage.editStyle': 'शैली बदलें', 'stage.selectLayer': '“{name}” लेयर चुनें', 'stage.captionStyle': 'ओवरले शैली', 'style.color': 'रंग', 'style.text': 'टेक्स्ट', 'style.changeColor': 'रंग बदलें: {target}', 'style.chooseColor': 'रंग चुनें', 'style.font': 'फ़ॉन्ट', 'stage.pause': 'रोकें', 'stage.play': 'चलाएँ', 'stage.trimRequired': 'ट्रिम मोड आवश्यक है', 'stage.cancelTrim': 'ट्रिम रद्द करें', 'stage.trimVideo': 'वीडियो ट्रिम करें', 'stage.trim': 'ट्रिम', 'stage.in': 'इन', 'stage.out': 'आउट', 'stage.clipStart': 'क्लिप शुरू', 'stage.clipEnd': 'क्लिप अंत', 'stage.maxDuration': 'अधिकतम {seconds}से', 'stage.apply': 'लागू करें', 'stage.playhead': 'प्लेहेड', 'stage.currentTime': 'वीडियो का वर्तमान समय', 'stage.caption': 'ओवरले', 'stage.start': 'शुरू', 'stage.stop': 'अंत', 'stage.captionStart': 'ओवरले शुरू', 'stage.captionEnd': 'ओवरले अंत',
  'error.webCodecs': 'यह ब्राउज़र WebCodecs का समर्थन नहीं करता।', 'error.container': 'केवल MP4 और MOV कंटेनर समर्थित हैं।', 'error.noVideo': 'चुनी फ़ाइल में वीडियो ट्रैक नहीं है।', 'error.videoCodec': 'यह वीडियो कोडेक ब्राउज़र में समर्थित नहीं है।', 'error.resolution': 'वीडियो रिज़ॉल्यूशन 4K सीमा (लंबी तरफ़ 3840 px) से अधिक है।', 'error.duration': 'वीडियो की अवधि नहीं मिल सकी।', 'error.audio': 'ऑडियो कोडेक AAC-LC नहीं है; एक्सपोर्ट बिना आवाज़ होगा।', 'error.capabilities': 'यह ब्राउज़र WebCodecs या OffscreenCanvas का समर्थन नहीं करता।', 'error.decoder': 'वीडियो डिकोडर कॉन्फ़िगरेशन नहीं मिल सका।', 'error.encoder': 'इस ब्राउज़र में उपयुक्त H.264 एनकोडर नहीं है।', 'error.generic': 'एक्सपोर्ट पूरा नहीं हो सका।',
};

const ar: BaseMessages = {
  'meta.title': 'klex — نصوص فوق الفيديو', 'brand.home': 'العودة إلى البداية', 'brand.tagline': 'نصوص الفيديو', 'language.label': 'اللغة',
  'layer.count': { zero: '{count} طبقات', one: 'طبقة واحدة', two: 'طبقتان', few: '{count} طبقات', many: '{count} طبقة', other: '{count} طبقة' }, 'header.export': 'تصدير', 'steps.label': 'خطوات المشروع', 'steps.video': 'الفيديو', 'steps.overlays': 'النصوص', 'steps.export': 'التصدير',
  'hero.eyebrow': 'محرر نصوص الفيديو', 'hero.before': 'أضف نصوصًا', 'hero.emphasis': 'معبرة', 'hero.after': 'مباشرة في متصفحك.', 'hero.subtitle': 'لن يُرفع الفيديو إلى أي خادم.',
  'upload.checking': 'جارٍ فحص الفيديو…', 'upload.drop': 'أفلت الفيديو هنا', 'upload.checkingHint': 'الترميز والمدة والدقة', 'upload.selectHint': 'أو انقر لاختيار ملف', 'upload.upTo4k': 'حتى 4K', 'upload.limit': 'حتى {seconds} ث لكل تصدير',
  'privacy.title': 'يبقى الفيديو لديك', 'privacy.body': 'تتم المعالجة محليًا في متصفحك.',
  'editor.step': 'الخطوة 2 من 3', 'editor.description': 'اضبط توقيت كل طبقة ونمطها وموضعها.', 'editor.addOverlay': 'إضافة نص', 'editor.overlays': 'نصوص الفيديو', 'editor.noText': 'بلا نص', 'editor.removeNamed': 'حذف «{name}»', 'editor.composition': 'التكوين', 'editor.layers': 'الطبقات', 'editor.addLayer': 'إضافة طبقة', 'editor.seconds': '{value}ث', 'editor.replaceVideo': 'استبدال الفيديو', 'editor.previewReady': 'المعاينة جاهزة', 'editor.previewPreparing': 'جارٍ إعداد المعاينة…',
  'export.finalStep': 'الخطوة الأخيرة', 'export.ready': 'جاهز للتصدير', 'export.description': 'راجع الإعدادات. يتم التصيير محليًا ليبقى فيديوك خاصًا.', 'export.file': 'الملف', 'export.clip': 'المقطع', 'export.composition': 'التكوين', 'export.quality': 'الجودة', 'export.chooseSize': 'اختر الحجم', 'export.high': 'عالية', 'export.highDetail': 'حتى 1080p · 12 Mbps', 'export.best': 'الأفضل', 'export.standard': 'عادية', 'export.standardDetail': 'حتى 1080p · 8 Mbps', 'export.balance': 'متوازنة', 'export.light': 'خفيفة', 'export.lightDetail': 'حتى 720p · 4 Mbps', 'export.fast': 'سريعة', 'export.saved': 'تم حفظ الملف. يمكنك تصديره مجددًا.', 'export.button': 'تصدير MP4', 'export.retry': 'إعادة المحاولة بالوضع الخفيف', 'export.back': 'العودة إلى المحرر',
  'trim.required': 'القص مطلوب', 'trim.tooLong': 'الفيديو طويل جدًا', 'trim.choose': 'اختر مقطعًا لا يتجاوز {seconds} ثانية للمتابعة.', 'progress.label': 'التصدير', 'progress.rendering': 'جارٍ تصيير الفيديو', 'progress.composing': 'جارٍ بناء التكوين', 'progress.elapsed': '{seconds}ث · لا تغلق علامة التبويب', 'common.cancel': 'إلغاء',
  'inspector.content': 'المحتوى', 'inspector.caption': 'نص الفيديو', 'inspector.delete': 'حذف', 'inspector.deleteLayer': 'حذف الطبقة', 'inspector.text': 'النص', 'inspector.appearance': 'المظهر', 'inspector.typography': 'الخط', 'inspector.typeface': 'نوع الخط', 'font.sans': 'بلا زوائد', 'font.serif': 'بزوائد', 'font.mono': 'أحادي', 'inspector.size': 'الحجم', 'inspector.textColor': 'لون النص', 'style.plate': 'الخلفية', 'style.stroke': 'الحد', 'style.fadeIn': 'ظهور تدريجي', 'style.fadeOut': 'اختفاء تدريجي', 'style.alignment': 'المحاذاة',
  'stage.preview': 'المعاينة', 'stage.activeText': 'نص الطبقة النشطة', 'stage.move': 'تحريك النص', 'stage.editStyle': 'تعديل النمط', 'stage.selectLayer': 'اختيار الطبقة «{name}»', 'stage.captionStyle': 'نمط النص', 'style.color': 'اللون', 'style.text': 'النص', 'style.changeColor': 'تغيير اللون: {target}', 'style.chooseColor': 'اختر لونًا', 'style.font': 'الخط', 'stage.pause': 'إيقاف مؤقت', 'stage.play': 'تشغيل', 'stage.trimRequired': 'وضع القص مطلوب', 'stage.cancelTrim': 'إلغاء القص', 'stage.trimVideo': 'قص الفيديو', 'stage.trim': 'القص', 'stage.in': 'البداية', 'stage.out': 'النهاية', 'stage.clipStart': 'بداية المقطع', 'stage.clipEnd': 'نهاية المقطع', 'stage.maxDuration': 'بحد أقصى {seconds}ث', 'stage.apply': 'تطبيق', 'stage.playhead': 'المؤشر', 'stage.currentTime': 'وقت الفيديو الحالي', 'stage.caption': 'النص', 'stage.start': 'بدء', 'stage.stop': 'توقف', 'stage.captionStart': 'بداية النص', 'stage.captionEnd': 'نهاية النص',
  'error.webCodecs': 'هذا المتصفح لا يدعم WebCodecs.', 'error.container': 'تُدعم حاويات MP4 وMOV فقط.', 'error.noVideo': 'لا يحتوي الملف المحدد على مسار فيديو.', 'error.videoCodec': 'ترميز الفيديو غير مدعوم في المتصفح.', 'error.resolution': 'تتجاوز دقة الفيديو حد 4K ‏(3840 px للضلع الأطول).', 'error.duration': 'تعذر تحديد مدة الفيديو.', 'error.audio': 'ترميز الصوت ليس AAC-LC؛ سيكون التصدير بلا صوت.', 'error.capabilities': 'هذا المتصفح لا يدعم WebCodecs أو OffscreenCanvas.', 'error.decoder': 'تعذر الحصول على إعدادات فك ترميز الفيديو.', 'error.encoder': 'لا يتوفر مُرمّز H.264 مناسب في هذا المتصفح.', 'error.generic': 'تعذر إكمال التصدير.',
};

const pt: BaseMessages = {
  'meta.title': 'klex — textos sobre vídeo', 'brand.home': 'Ir ao início', 'brand.tagline': 'textos em vídeo', 'language.label': 'Idioma',
  'layer.count': { one: '{count} camada', other: '{count} camadas' }, 'header.export': 'Exportar', 'steps.label': 'Etapas do projeto', 'steps.video': 'Vídeo', 'steps.overlays': 'Textos', 'steps.export': 'Exportar',
  'hero.eyebrow': 'Editor de textos', 'hero.before': 'Adicione textos', 'hero.emphasis': 'expressivos', 'hero.after': 'direto no navegador.', 'hero.subtitle': 'Seu vídeo nunca é enviado a um servidor.',
  'upload.checking': 'Verificando vídeo…', 'upload.drop': 'Solte seu vídeo aqui', 'upload.checkingHint': 'Codec, duração e resolução', 'upload.selectHint': 'ou clique para escolher um arquivo', 'upload.upTo4k': 'até 4K', 'upload.limit': 'até {seconds}s por exportação',
  'privacy.title': 'Seu vídeo fica com você', 'privacy.body': 'O processamento ocorre localmente no navegador.',
  'editor.step': 'Etapa 2 de 3', 'editor.description': 'Ajuste o tempo, estilo e posição de cada camada.', 'editor.addOverlay': 'Adicionar texto', 'editor.overlays': 'Textos', 'editor.noText': 'Sem texto', 'editor.removeNamed': 'Remover “{name}”', 'editor.composition': 'Composição', 'editor.layers': 'Camadas', 'editor.addLayer': 'Adicionar camada', 'editor.seconds': '{value}s', 'editor.replaceVideo': 'Trocar vídeo', 'editor.previewReady': 'Prévia pronta', 'editor.previewPreparing': 'Preparando prévia…',
  'export.finalStep': 'Etapa final', 'export.ready': 'Pronto para exportar', 'export.description': 'Revise as opções. A renderização é local e seu vídeo permanece privado.', 'export.file': 'Arquivo', 'export.clip': 'Trecho', 'export.composition': 'Composição', 'export.quality': 'Qualidade', 'export.chooseSize': 'Escolha o tamanho', 'export.high': 'Alta', 'export.highDetail': 'Até 1080p · 12 Mbps', 'export.best': 'Melhor', 'export.standard': 'Normal', 'export.standardDetail': 'Até 1080p · 8 Mbps', 'export.balance': 'Equilíbrio', 'export.light': 'Leve', 'export.lightDetail': 'Até 720p · 4 Mbps', 'export.fast': 'Rápido', 'export.saved': 'Arquivo salvo. Você pode exportar novamente.', 'export.button': 'Exportar MP4', 'export.retry': 'Tentar novamente no modo leve', 'export.back': 'Voltar ao editor',
  'trim.required': 'Recorte necessário', 'trim.tooLong': 'O vídeo é longo demais', 'trim.choose': 'Escolha um trecho de até {seconds} segundos para continuar.', 'progress.label': 'Exportação', 'progress.rendering': 'Renderizando vídeo', 'progress.composing': 'Montando composição', 'progress.elapsed': '{seconds}s · não feche esta aba', 'common.cancel': 'Cancelar',
  'inspector.content': 'Conteúdo', 'inspector.caption': 'Texto', 'inspector.delete': 'Excluir', 'inspector.deleteLayer': 'Excluir camada', 'inspector.text': 'Texto', 'inspector.appearance': 'Aparência', 'inspector.typography': 'Tipografia', 'inspector.typeface': 'Fonte', 'font.sans': 'Sem serifa', 'font.serif': 'Serifa', 'font.mono': 'Mono', 'inspector.size': 'Tamanho', 'inspector.textColor': 'Cor do texto', 'style.plate': 'Placa', 'style.stroke': 'Contorno', 'style.fadeIn': 'Aparecer', 'style.fadeOut': 'Desaparecer', 'style.alignment': 'Alinhamento',
  'stage.preview': 'Prévia', 'stage.activeText': 'Texto ativo', 'stage.move': 'Mover texto', 'stage.editStyle': 'Editar estilo', 'stage.selectLayer': 'Selecionar camada “{name}”', 'stage.captionStyle': 'Estilo do texto', 'style.color': 'Cor', 'style.text': 'Texto', 'style.changeColor': 'Alterar cor: {target}', 'style.chooseColor': 'Escolha uma cor', 'style.font': 'Fonte', 'stage.pause': 'Pausar', 'stage.play': 'Reproduzir', 'stage.trimRequired': 'O modo de recorte é obrigatório', 'stage.cancelTrim': 'Cancelar recorte', 'stage.trimVideo': 'Recortar vídeo', 'stage.trim': 'Recorte', 'stage.in': 'Entrada', 'stage.out': 'Saída', 'stage.clipStart': 'Início do trecho', 'stage.clipEnd': 'Fim do trecho', 'stage.maxDuration': 'No máximo {seconds}s', 'stage.apply': 'Aplicar', 'stage.playhead': 'Cursor', 'stage.currentTime': 'Momento atual do vídeo', 'stage.caption': 'Texto', 'stage.start': 'Início', 'stage.stop': 'Fim', 'stage.captionStart': 'Início do texto', 'stage.captionEnd': 'Fim do texto',
  'error.webCodecs': 'Este navegador não suporta WebCodecs.', 'error.container': 'Apenas contêineres MP4 e MOV são aceitos.', 'error.noVideo': 'O arquivo selecionado não tem faixa de vídeo.', 'error.videoCodec': 'Este codec de vídeo não é suportado pelo navegador.', 'error.resolution': 'A resolução excede o limite 4K (3840 px no lado maior).', 'error.duration': 'Não foi possível determinar a duração do vídeo.', 'error.audio': 'O codec de áudio não é AAC-LC; a exportação ficará sem som.', 'error.capabilities': 'Este navegador não suporta WebCodecs ou OffscreenCanvas.', 'error.decoder': 'Não foi possível obter a configuração do decodificador.', 'error.encoder': 'Não há codificador H.264 compatível neste navegador.', 'error.generic': 'Não foi possível concluir a exportação.',
};

// The remaining catalogs deliberately use complete dictionaries. Keeping every key present
// makes missing translations a compile-time error whenever the English source is extended.
const bn: BaseMessages = localisedCatalog({
  title: 'klex — ভিডিওতে লেখা', home: 'শুরুতে যান', tagline: 'ভিডিও টেক্সট', language: 'ভাষা', layer: '{count}টি লেয়ার', export: 'এক্সপোর্ট', video: 'ভিডিও', overlays: 'লেখা', stepsLabel: 'প্রকল্পের ধাপ',
  hero: ['টেক্সট ওভারলে এডিটর', 'ব্রাউজারেই', 'প্রাণবন্ত', 'লেখা যোগ করুন।', 'আপনার ভিডিও কোনো সার্ভারে আপলোড হয় না।'], upload: ['ভিডিও পরীক্ষা হচ্ছে…', 'ভিডিওটি এখানে ছাড়ুন', 'কোডেক, সময়কাল ও রেজোলিউশন', 'অথবা ফাইল বাছতে ক্লিক করুন', '4K পর্যন্ত', 'প্রতি এক্সপোর্টে {seconds}সে পর্যন্ত'], privacy: ['ভিডিও আপনার কাছেই থাকে', 'সব প্রক্রিয়া ব্রাউজারেই স্থানীয়ভাবে হয়।'],
  editor: ['৩টির মধ্যে ধাপ ২', 'প্রতিটি লেয়ারের সময়, স্টাইল ও অবস্থান ঠিক করুন।', 'লেখা যোগ করুন', 'টেক্সট ওভারলে', 'লেখা নেই', '“{name}” সরান', 'কম্পোজিশন', 'লেয়ার', 'লেয়ার যোগ করুন', '{value}সে', 'ভিডিও বদলান', 'প্রিভিউ প্রস্তুত', 'প্রিভিউ তৈরি হচ্ছে…'],
  exportPanel: ['শেষ ধাপ', 'এক্সপোর্টের জন্য প্রস্তুত', 'সেটিং দেখুন। রেন্ডারিং স্থানীয়ভাবে হয়, তাই ভিডিও ব্যক্তিগত থাকে।', 'ফাইল', 'ক্লিপ', 'কম্পোজিশন', 'গুণমান', 'আকার বাছুন', 'উচ্চ', '1080p পর্যন্ত · 12 Mbps', 'সেরা', 'স্ট্যান্ডার্ড', '1080p পর্যন্ত · 8 Mbps', 'ভারসাম্য', 'হালকা', '720p পর্যন্ত · 4 Mbps', 'দ্রুত', 'ফাইল সেভ হয়েছে। আবার এক্সপোর্ট করতে পারেন।', 'MP4 এক্সপোর্ট করুন', 'হালকা মোডে আবার চেষ্টা করুন', 'এডিটরে ফিরুন'],
  trim: ['ট্রিম করা দরকার', 'ভিডিওটি খুব লম্বা', 'চালিয়ে যেতে {seconds} সেকেন্ড পর্যন্ত একটি ক্লিপ বাছুন।'], progress: ['এক্সপোর্ট', 'ভিডিও রেন্ডার হচ্ছে', 'কম্পোজিশন তৈরি হচ্ছে', '{seconds}সে · ট্যাবটি বন্ধ করবেন না', 'বাতিল'],
  inspector: ['বিষয়বস্তু', 'টেক্সট ওভারলে', 'মুছুন', 'লেয়ার মুছুন', 'লেখা', 'চেহারা', 'টাইপোগ্রাফি', 'টাইপফেস', 'স্যান্স', 'সেরিফ', 'মোনো', 'আকার', 'লেখার রং', 'প্লেট', 'স্ট্রোক', 'ফেড ইন', 'ফেড আউট', 'অ্যালাইনমেন্ট'],
  stage: ['প্রিভিউ', 'সক্রিয় ওভারলের লেখা', 'ওভারলে সরান', 'স্টাইল বদলান', '“{name}” লেয়ার বাছুন', 'ওভারলে স্টাইল', 'রং', 'লেখা', 'রং বদলান: {target}', 'রং বাছুন', 'ফন্ট', 'বিরতি', 'চালান', 'ট্রিম মোড আবশ্যক', 'ট্রিম বাতিল', 'ভিডিও ট্রিম করুন', 'ট্রিম', 'ইন', 'আউট', 'ক্লিপ শুরু', 'ক্লিপ শেষ', 'সর্বোচ্চ {seconds}সে', 'প্রয়োগ', 'প্লেহেড', 'ভিডিওর বর্তমান সময়', 'ওভারলে', 'শুরু', 'শেষ', 'ওভারলে শুরু', 'ওভারলে শেষ'],
  errors: ['এই ব্রাউজার WebCodecs সমর্থন করে না।', 'শুধু MP4 ও MOV কনটেইনার সমর্থিত।', 'নির্বাচিত ফাইলে ভিডিও ট্র্যাক নেই।', 'এই ভিডিও কোডেক ব্রাউজারে সমর্থিত নয়।', 'ভিডিও রেজোলিউশন 4K সীমা (লম্বা পাশে 3840 px) ছাড়িয়েছে।', 'ভিডিওর সময়কাল জানা যায়নি।', 'অডিও কোডেক AAC-LC নয়; এক্সপোর্টে শব্দ থাকবে না।', 'এই ব্রাউজার WebCodecs বা OffscreenCanvas সমর্থন করে না।', 'ভিডিও ডিকোডার কনফিগারেশন পাওয়া যায়নি।', 'এই ব্রাউজারে উপযুক্ত H.264 এনকোডার নেই।', 'এক্সপোর্ট সম্পন্ন করা যায়নি।'],
});

const ru: BaseMessages = localisedCatalog({
  title: 'klex — надписи поверх видео', home: 'В начало', tagline: 'надписи на видео', language: 'Язык', layer: { one: '{count} слой', few: '{count} слоя', many: '{count} слоёв', other: '{count} слоя' }, export: 'Экспорт', video: 'Видео', overlays: 'Надписи', stepsLabel: 'Этапы проекта',
  hero: ['Редактор надписей', 'Добавьте', 'выразительные', 'надписи прямо в браузере.', 'Без загрузки видео на сервер.'], upload: ['Проверяем видео…', 'Перетащите видео сюда', 'Кодек, длительность и разрешение', 'или нажмите, чтобы выбрать файл', 'до 4K', 'до {seconds} с за экспорт'], privacy: ['Видео остаётся у вас', 'Обработка выполняется локально в браузере.'],
  editor: ['Шаг 2 из 3', 'Настройте время, стиль и положение каждого слоя.', 'Добавить надпись', 'Надписи', 'Без текста', 'Удалить «{name}»', 'Композиция', 'Слои', 'Добавить слой', '{value} с', 'Заменить видео', 'Предпросмотр готов', 'Готовим предпросмотр…'],
  exportPanel: ['Финальный шаг', 'Готово к экспорту', 'Проверьте параметры. Рендер выполняется локально — видео остаётся приватным.', 'Файл', 'Фрагмент', 'Композиция', 'Качество', 'Выберите размер', 'Высокое', 'До 1080p · 12 Мбит/с', 'Лучшее', 'Обычное', 'До 1080p · 8 Мбит/с', 'Баланс', 'Лёгкое', 'До 720p · 4 Мбит/с', 'Быстро', 'Файл сохранён. Можно экспортировать ещё раз.', 'Экспортировать MP4', 'Повторить в лёгком режиме', 'Вернуться к редактору'],
  trim: ['Нужна обрезка', 'Видео слишком длинное', 'Выберите фрагмент длительностью до {seconds} секунд, чтобы продолжить.'], progress: ['Экспорт', 'Рендерим видео', 'Собираем композицию', '{seconds} с · не закрывайте вкладку', 'Отменить'],
  inspector: ['Содержимое', 'Надпись', 'Удалить', 'Удалить слой', 'Текст', 'Вид', 'Типографика', 'Гарнитура', 'Гротеск', 'Антиква', 'Моно', 'Размер', 'Цвет текста', 'Плашка', 'Обводка', 'Плавное появление', 'Плавное затухание', 'Выравнивание'],
  stage: ['Предпросмотр', 'Текст активной надписи', 'Переместить надпись', 'Настроить стиль', 'Выбрать слой «{name}»', 'Стиль надписи', 'Цвет', 'Текст', 'Изменить цвет: {target}', 'Выберите цвет', 'Шрифт', 'Пауза', 'Воспроизвести', 'Режим обрезки обязателен', 'Отменить обрезку', 'Обрезать видео', 'Обрезка', 'Вход', 'Выход', 'Начало фрагмента', 'Конец фрагмента', 'Не более {seconds} с', 'Применить', 'Курсор', 'Текущий момент видео', 'Надпись', 'Начало', 'Конец', 'Начало надписи', 'Конец надписи'],
  errors: ['Этот браузер не поддерживает WebCodecs.', 'Поддерживаются только контейнеры MP4 и MOV.', 'В выбранном файле нет видеодорожки.', 'Видеокодек этого файла не поддерживается браузером.', 'Разрешение видео превышает предел 4K (3840 px по большей стороне).', 'Не удалось определить длительность видео.', 'Аудиокодек не AAC-LC: экспорт будет выполнен без звука.', 'Этот браузер не поддерживает WebCodecs или OffscreenCanvas.', 'Не удалось получить конфигурацию видеодекодера.', 'В этом браузере нет подходящего H.264-кодера.', 'Экспорт не выполнен.'],
});

const ja: BaseMessages = localisedCatalog({
  title: 'klex — 動画テキスト', home: '最初に戻る', tagline: '動画テキスト', language: '言語', layer: '{count} レイヤー', export: '書き出し', video: '動画', overlays: 'テキスト', stepsLabel: 'プロジェクトの手順',
  hero: ['テキスト編集', 'ブラウザで', '印象的な', 'テキストを追加。', '動画がサーバーに送信されることはありません。'], upload: ['動画を確認中…', '動画をここにドロップ', 'コーデック、長さ、解像度', 'またはクリックしてファイルを選択', '最大 4K', '1回の書き出しは最大 {seconds} 秒'], privacy: ['動画は手元に残ります', '処理はブラウザ内で行われます。'],
  editor: ['ステップ 2 / 3', '各レイヤーの時間、スタイル、位置を設定します。', 'テキストを追加', 'テキスト', 'テキストなし', '「{name}」を削除', 'コンポジション', 'レイヤー', 'レイヤーを追加', '{value}秒', '動画を変更', 'プレビュー準備完了', 'プレビューを準備中…'],
  exportPanel: ['最終ステップ', '書き出し準備完了', '設定を確認してください。レンダリングはローカルで行われ、動画は非公開のままです。', 'ファイル', 'クリップ', 'コンポジション', '品質', 'サイズを選択', '高品質', '最大 1080p · 12 Mbps', '最高', '標準', '最大 1080p · 8 Mbps', 'バランス', '軽量', '最大 720p · 4 Mbps', '高速', 'ファイルを保存しました。もう一度書き出せます。', 'MP4を書き出す', '軽量モードで再試行', 'エディターに戻る'],
  trim: ['トリミングが必要です', '動画が長すぎます', '続行するには {seconds} 秒以内のクリップを選択してください。'], progress: ['書き出し', '動画をレンダリング中', 'コンポジションを作成中', '{seconds}秒 · このタブを閉じないでください', 'キャンセル'],
  inspector: ['内容', 'テキスト', '削除', 'レイヤーを削除', 'テキスト', '外観', 'タイポグラフィ', '書体', 'ゴシック', '明朝', '等幅', 'サイズ', '文字色', '背景', '縁取り', 'フェードイン', 'フェードアウト', '配置'],
  stage: ['プレビュー', '選択中のテキスト', 'テキストを移動', 'スタイルを編集', 'レイヤー「{name}」を選択', 'テキストスタイル', '色', 'テキスト', '色を変更：{target}', '色を選択', 'フォント', '一時停止', '再生', 'トリミングモードが必要です', 'トリミングをキャンセル', '動画をトリミング', 'トリミング', 'イン', 'アウト', 'クリップ開始', 'クリップ終了', '最大 {seconds} 秒', '適用', '再生位置', '現在の動画位置', 'テキスト', '開始', '終了', 'テキスト開始', 'テキスト終了'],
  errors: ['このブラウザはWebCodecsに対応していません。', 'MP4とMOVのみ対応しています。', '選択したファイルに動画トラックがありません。', 'この動画コーデックはブラウザでサポートされていません。', '動画の解像度が4K上限（長辺3840 px）を超えています。', '動画の長さを取得できませんでした。', '音声コーデックがAAC-LCではないため、無音で書き出されます。', 'このブラウザはWebCodecsまたはOffscreenCanvasに対応していません。', '動画デコーダー設定を取得できませんでした。', '利用可能なH.264エンコーダーがありません。', '書き出しを完了できませんでした。'],
});

const fr: BaseMessages = localisedCatalog({
  title: 'klex — textes sur vidéo', home: 'Revenir au début', tagline: 'textes vidéo', language: 'Langue', layer: { one: '{count} calque', other: '{count} calques' }, export: 'Exporter', video: 'Vidéo', overlays: 'Textes', stepsLabel: 'Étapes du projet',
  hero: ['Éditeur de textes', 'Ajoutez des textes', 'expressifs', 'directement dans votre navigateur.', 'Votre vidéo n’est jamais envoyée à un serveur.'], upload: ['Vérification de la vidéo…', 'Déposez votre vidéo ici', 'Codec, durée et résolution', 'ou cliquez pour choisir un fichier', 'jusqu’à 4K', 'jusqu’à {seconds}s par export'], privacy: ['Votre vidéo reste chez vous', 'Le traitement est effectué localement dans le navigateur.'],
  editor: ['Étape 2 sur 3', 'Réglez la durée, le style et la position de chaque calque.', 'Ajouter du texte', 'Textes', 'Sans texte', 'Supprimer « {name} »', 'Composition', 'Calques', 'Ajouter un calque', '{value}s', 'Changer de vidéo', 'Aperçu prêt', 'Préparation de l’aperçu…'],
  exportPanel: ['Dernière étape', 'Prêt à exporter', 'Vérifiez les réglages. Le rendu est local et votre vidéo reste privée.', 'Fichier', 'Extrait', 'Composition', 'Qualité', 'Choisissez une taille', 'Haute', 'Jusqu’à 1080p · 12 Mbps', 'Meilleure', 'Standard', 'Jusqu’à 1080p · 8 Mbps', 'Équilibre', 'Légère', 'Jusqu’à 720p · 4 Mbps', 'Rapide', 'Fichier enregistré. Vous pouvez l’exporter à nouveau.', 'Exporter en MP4', 'Réessayer en mode léger', 'Retour à l’éditeur'],
  trim: ['Découpage requis', 'La vidéo est trop longue', 'Choisissez un extrait de {seconds} secondes maximum pour continuer.'], progress: ['Export', 'Rendu de la vidéo', 'Création de la composition', '{seconds}s · ne fermez pas cet onglet', 'Annuler'],
  inspector: ['Contenu', 'Texte', 'Supprimer', 'Supprimer le calque', 'Texte', 'Aspect', 'Typographie', 'Police', 'Sans', 'Serif', 'Mono', 'Taille', 'Couleur du texte', 'Plaque', 'Contour', 'Apparition', 'Disparition', 'Alignement'],
  stage: ['Aperçu', 'Texte actif', 'Déplacer le texte', 'Modifier le style', 'Sélectionner le calque « {name} »', 'Style du texte', 'Couleur', 'Texte', 'Changer la couleur : {target}', 'Choisir une couleur', 'Police', 'Pause', 'Lire', 'Le mode découpage est requis', 'Annuler le découpage', 'Découper la vidéo', 'Découpage', 'Entrée', 'Sortie', 'Début de l’extrait', 'Fin de l’extrait', '{seconds}s maximum', 'Appliquer', 'Curseur', 'Position actuelle', 'Texte', 'Début', 'Fin', 'Début du texte', 'Fin du texte'],
  errors: ['Ce navigateur ne prend pas en charge WebCodecs.', 'Seuls les conteneurs MP4 et MOV sont acceptés.', 'Le fichier sélectionné ne contient aucune piste vidéo.', 'Ce codec vidéo n’est pas pris en charge.', 'La résolution dépasse la limite 4K (3840 px sur le côté le plus long).', 'Impossible de déterminer la durée de la vidéo.', 'Le codec audio n’est pas AAC-LC ; l’export sera sans son.', 'Ce navigateur ne prend pas en charge WebCodecs ou OffscreenCanvas.', 'Impossible d’obtenir la configuration du décodeur.', 'Aucun encodeur H.264 compatible n’est disponible.', 'Impossible de terminer l’exportation.'],
});

const de: BaseMessages = localisedCatalog({
  title: 'klex — Text über Video', home: 'Zum Anfang', tagline: 'Videotext', language: 'Sprache', layer: { one: '{count} Ebene', other: '{count} Ebenen' }, export: 'Exportieren', video: 'Video', overlays: 'Texte', stepsLabel: 'Projektschritte',
  hero: ['Texteditor', 'Füge', 'ausdrucksstarken', 'Text direkt im Browser hinzu.', 'Dein Video wird nie auf einen Server geladen.'], upload: ['Video wird geprüft…', 'Video hier ablegen', 'Codec, Dauer und Auflösung', 'oder klicken, um eine Datei zu wählen', 'bis zu 4K', 'bis zu {seconds}s pro Export'], privacy: ['Dein Video bleibt bei dir', 'Die Verarbeitung erfolgt lokal im Browser.'],
  editor: ['Schritt 2 von 3', 'Lege Zeit, Stil und Position jeder Ebene fest.', 'Text hinzufügen', 'Texte', 'Kein Text', '„{name}“ entfernen', 'Komposition', 'Ebenen', 'Ebene hinzufügen', '{value}s', 'Video ersetzen', 'Vorschau bereit', 'Vorschau wird vorbereitet…'],
  exportPanel: ['Letzter Schritt', 'Bereit zum Export', 'Prüfe die Einstellungen. Das Rendering erfolgt lokal und dein Video bleibt privat.', 'Datei', 'Ausschnitt', 'Komposition', 'Qualität', 'Größe wählen', 'Hoch', 'Bis 1080p · 12 Mbps', 'Beste', 'Standard', 'Bis 1080p · 8 Mbps', 'Ausgewogen', 'Leicht', 'Bis 720p · 4 Mbps', 'Schnell', 'Datei gespeichert. Du kannst erneut exportieren.', 'MP4 exportieren', 'Im leichten Modus wiederholen', 'Zurück zum Editor'],
  trim: ['Kürzen erforderlich', 'Das Video ist zu lang', 'Wähle zum Fortfahren einen Ausschnitt bis {seconds} Sekunden.'], progress: ['Export', 'Video wird gerendert', 'Komposition wird erstellt', '{seconds}s · Tab nicht schließen', 'Abbrechen'],
  inspector: ['Inhalt', 'Text', 'Löschen', 'Ebene löschen', 'Text', 'Aussehen', 'Typografie', 'Schriftart', 'Sans', 'Serif', 'Mono', 'Größe', 'Textfarbe', 'Fläche', 'Kontur', 'Einblenden', 'Ausblenden', 'Ausrichtung'],
  stage: ['Vorschau', 'Aktiver Text', 'Text verschieben', 'Stil bearbeiten', 'Ebene „{name}“ wählen', 'Textstil', 'Farbe', 'Text', 'Farbe ändern: {target}', 'Farbe wählen', 'Schrift', 'Pause', 'Abspielen', 'Kürzmodus ist erforderlich', 'Kürzen abbrechen', 'Video kürzen', 'Kürzen', 'Anfang', 'Ende', 'Ausschnittanfang', 'Ausschnittende', 'Höchstens {seconds}s', 'Anwenden', 'Abspielkopf', 'Aktuelle Videozeit', 'Text', 'Start', 'Stopp', 'Textanfang', 'Textende'],
  errors: ['Dieser Browser unterstützt WebCodecs nicht.', 'Nur MP4- und MOV-Container werden unterstützt.', 'Die gewählte Datei enthält keine Videospur.', 'Dieser Videocodec wird vom Browser nicht unterstützt.', 'Die Auflösung überschreitet das 4K-Limit (3840 px an der längsten Seite).', 'Die Videodauer konnte nicht bestimmt werden.', 'Der Audiocodec ist nicht AAC-LC; der Export enthält keinen Ton.', 'Dieser Browser unterstützt WebCodecs oder OffscreenCanvas nicht.', 'Die Videodecoder-Konfiguration konnte nicht geladen werden.', 'Kein geeigneter H.264-Encoder ist verfügbar.', 'Der Export konnte nicht abgeschlossen werden.'],
});

const id: BaseMessages = localisedCatalog({
  title: 'klex — teks di atas video', home: 'Ke awal', tagline: 'teks video', language: 'Bahasa', layer: '{count} lapisan', export: 'Ekspor', video: 'Video', overlays: 'Teks', stepsLabel: 'Langkah proyek',
  hero: ['Editor teks', 'Tambahkan teks', 'ekspresif', 'langsung di browser.', 'Video Anda tidak pernah diunggah ke server.'], upload: ['Memeriksa video…', 'Taruh video di sini', 'Codec, durasi, dan resolusi', 'atau klik untuk memilih file', 'hingga 4K', 'hingga {seconds} dtk per ekspor'], privacy: ['Video tetap bersama Anda', 'Pemrosesan dilakukan secara lokal di browser.'],
  editor: ['Langkah 2 dari 3', 'Atur waktu, gaya, dan posisi setiap lapisan.', 'Tambah teks', 'Teks', 'Tanpa teks', 'Hapus “{name}”', 'Komposisi', 'Lapisan', 'Tambah lapisan', '{value} dtk', 'Ganti video', 'Pratinjau siap', 'Menyiapkan pratinjau…'],
  exportPanel: ['Langkah terakhir', 'Siap diekspor', 'Periksa pengaturan. Rendering dilakukan lokal sehingga video tetap privat.', 'File', 'Klip', 'Komposisi', 'Kualitas', 'Pilih ukuran', 'Tinggi', 'Hingga 1080p · 12 Mbps', 'Terbaik', 'Standar', 'Hingga 1080p · 8 Mbps', 'Seimbang', 'Ringan', 'Hingga 720p · 4 Mbps', 'Cepat', 'File disimpan. Anda dapat mengekspor lagi.', 'Ekspor MP4', 'Coba lagi dalam mode ringan', 'Kembali ke editor'],
  trim: ['Perlu dipangkas', 'Video terlalu panjang', 'Pilih klip hingga {seconds} detik untuk melanjutkan.'], progress: ['Ekspor', 'Merender video', 'Menyusun komposisi', '{seconds} dtk · jangan tutup tab ini', 'Batal'],
  inspector: ['Konten', 'Teks', 'Hapus', 'Hapus lapisan', 'Teks', 'Tampilan', 'Tipografi', 'Jenis huruf', 'Sans', 'Serif', 'Mono', 'Ukuran', 'Warna teks', 'Pelat', 'Garis tepi', 'Muncul', 'Menghilang', 'Perataan'],
  stage: ['Pratinjau', 'Teks aktif', 'Pindahkan teks', 'Ubah gaya', 'Pilih lapisan “{name}”', 'Gaya teks', 'Warna', 'Teks', 'Ubah warna: {target}', 'Pilih warna', 'Font', 'Jeda', 'Putar', 'Mode pangkas wajib', 'Batalkan pangkas', 'Pangkas video', 'Pangkas', 'Masuk', 'Keluar', 'Awal klip', 'Akhir klip', 'Maksimal {seconds} dtk', 'Terapkan', 'Playhead', 'Waktu video saat ini', 'Teks', 'Mulai', 'Selesai', 'Awal teks', 'Akhir teks'],
  errors: ['Browser ini tidak mendukung WebCodecs.', 'Hanya kontainer MP4 dan MOV yang didukung.', 'File yang dipilih tidak memiliki trek video.', 'Codec video ini tidak didukung browser.', 'Resolusi melebihi batas 4K (3840 px pada sisi terpanjang).', 'Durasi video tidak dapat ditentukan.', 'Codec audio bukan AAC-LC; ekspor tidak akan bersuara.', 'Browser ini tidak mendukung WebCodecs atau OffscreenCanvas.', 'Konfigurasi dekoder video tidak dapat diperoleh.', 'Tidak ada enkoder H.264 yang sesuai.', 'Ekspor tidak dapat diselesaikan.'],
});

const tr: BaseMessages = localisedCatalog({
  title: 'klex — video üzerine yazı', home: 'Başa dön', tagline: 'video yazıları', language: 'Dil', layer: '{count} katman', export: 'Dışa aktar', video: 'Video', overlays: 'Yazılar', stepsLabel: 'Proje adımları',
  hero: ['Yazı editörü', 'Tarayıcında', 'etkileyici', 'yazılar ekle.', 'Videon hiçbir zaman sunucuya yüklenmez.'], upload: ['Video kontrol ediliyor…', 'Videoyu buraya bırak', 'Kodek, süre ve çözünürlük', 'veya dosya seçmek için tıkla', '4K’ya kadar', 'dışa aktarma başına {seconds} sn'], privacy: ['Videon sende kalır', 'İşlem tarayıcında yerel olarak yapılır.'],
  editor: ['3 adımın 2.si', 'Her katmanın zamanını, stilini ve konumunu ayarla.', 'Yazı ekle', 'Yazılar', 'Yazı yok', '“{name}” öğesini kaldır', 'Kompozisyon', 'Katmanlar', 'Katman ekle', '{value} sn', 'Videoyu değiştir', 'Önizleme hazır', 'Önizleme hazırlanıyor…'],
  exportPanel: ['Son adım', 'Dışa aktarmaya hazır', 'Ayarları kontrol et. İşleme yerel yapılır ve videon gizli kalır.', 'Dosya', 'Klip', 'Kompozisyon', 'Kalite', 'Boyut seç', 'Yüksek', '1080p’ye kadar · 12 Mbps', 'En iyi', 'Standart', '1080p’ye kadar · 8 Mbps', 'Dengeli', 'Hafif', '720p’ye kadar · 4 Mbps', 'Hızlı', 'Dosya kaydedildi. Tekrar dışa aktarabilirsin.', 'MP4 dışa aktar', 'Hafif modda tekrar dene', 'Editöre dön'],
  trim: ['Kırpma gerekli', 'Video çok uzun', 'Devam etmek için en fazla {seconds} saniyelik klip seç.'], progress: ['Dışa aktarma', 'Video işleniyor', 'Kompozisyon hazırlanıyor', '{seconds} sn · bu sekmeyi kapatma', 'İptal'],
  inspector: ['İçerik', 'Yazı', 'Sil', 'Katmanı sil', 'Metin', 'Görünüm', 'Tipografi', 'Yazı tipi', 'Sans', 'Serif', 'Mono', 'Boyut', 'Metin rengi', 'Plaka', 'Kontur', 'Belirme', 'Solma', 'Hizalama'],
  stage: ['Önizleme', 'Etkin yazı metni', 'Yazıyı taşı', 'Stili düzenle', '“{name}” katmanını seç', 'Yazı stili', 'Renk', 'Metin', 'Rengi değiştir: {target}', 'Renk seç', 'Yazı tipi', 'Duraklat', 'Oynat', 'Kırpma modu gerekli', 'Kırpmayı iptal et', 'Videoyu kırp', 'Kırpma', 'Giriş', 'Çıkış', 'Klip başlangıcı', 'Klip sonu', 'En fazla {seconds} sn', 'Uygula', 'Oynatma kafası', 'Geçerli video zamanı', 'Yazı', 'Başlangıç', 'Bitiş', 'Yazı başlangıcı', 'Yazı bitişi'],
  errors: ['Bu tarayıcı WebCodecs’i desteklemiyor.', 'Yalnızca MP4 ve MOV kapsayıcıları desteklenir.', 'Seçilen dosyada video parçası yok.', 'Bu video kodeki tarayıcı tarafından desteklenmiyor.', 'Video çözünürlüğü 4K sınırını (uzun kenarda 3840 px) aşıyor.', 'Video süresi belirlenemedi.', 'Ses kodeki AAC-LC değil; dışa aktarma sessiz olacak.', 'Bu tarayıcı WebCodecs veya OffscreenCanvas’ı desteklemiyor.', 'Video kod çözücü yapılandırması alınamadı.', 'Uygun H.264 kodlayıcı bulunamadı.', 'Dışa aktarma tamamlanamadı.'],
});

const ur: BaseMessages = localisedCatalog({
  title: 'klex — ویڈیو پر متن', home: 'شروع پر جائیں', tagline: 'ویڈیو متن', language: 'زبان', layer: '{count} تہیں', export: 'ایکسپورٹ', video: 'ویڈیو', overlays: 'متن', stepsLabel: 'پروجیکٹ کے مراحل',
  hero: ['متن ایڈیٹر', 'براؤزر ہی میں', 'دلکش', 'متن شامل کریں۔', 'آپ کی ویڈیو کبھی سرور پر اپ لوڈ نہیں ہوتی۔'], upload: ['ویڈیو جانچی جا رہی ہے…', 'ویڈیو یہاں چھوڑیں', 'کوڈیک، دورانیہ اور ریزولوشن', 'یا فائل منتخب کرنے کے لیے کلک کریں', '4K تک', 'ہر ایکسپورٹ میں {seconds} سیکنڈ تک'], privacy: ['ویڈیو آپ کے پاس رہتی ہے', 'پروسیسنگ براؤزر میں مقامی طور پر ہوتی ہے۔'],
  editor: ['3 میں سے مرحلہ 2', 'ہر تہہ کا وقت، انداز اور مقام طے کریں۔', 'متن شامل کریں', 'متن', 'کوئی متن نہیں', '“{name}” ہٹائیں', 'ترکیب', 'تہیں', 'تہہ شامل کریں', '{value} ث', 'ویڈیو بدلیں', 'پیش منظر تیار', 'پیش منظر تیار ہو رہا ہے…'],
  exportPanel: ['آخری مرحلہ', 'ایکسپورٹ کے لیے تیار', 'ترتیبات دیکھیں۔ رینڈرنگ مقامی ہے، اس لیے ویڈیو نجی رہتی ہے۔', 'فائل', 'کلپ', 'ترکیب', 'معیار', 'سائز منتخب کریں', 'اعلیٰ', '1080p تک · 12 Mbps', 'بہترین', 'معیاری', '1080p تک · 8 Mbps', 'متوازن', 'ہلکا', '720p تک · 4 Mbps', 'تیز', 'فائل محفوظ ہو گئی۔ دوبارہ ایکسپورٹ کر سکتے ہیں۔', 'MP4 ایکسپورٹ کریں', 'ہلکے موڈ میں دوبارہ کوشش', 'ایڈیٹر پر واپس'],
  trim: ['تراشنا ضروری ہے', 'ویڈیو بہت لمبی ہے', 'جاری رکھنے کے لیے {seconds} سیکنڈ تک کا کلپ منتخب کریں۔'], progress: ['ایکسپورٹ', 'ویڈیو رینڈر ہو رہی ہے', 'ترکیب بن رہی ہے', '{seconds} ث · یہ ٹیب بند نہ کریں', 'منسوخ'],
  inspector: ['مواد', 'متن', 'حذف', 'تہہ حذف کریں', 'متن', 'ظاہری شکل', 'خطاطی', 'خط', 'سینز', 'سیرف', 'مونو', 'سائز', 'متن کا رنگ', 'پلیٹ', 'کنارہ', 'آہستہ ظاہر', 'آہستہ غائب', 'سیدھ'],
  stage: ['پیش منظر', 'فعال متن', 'متن منتقل کریں', 'انداز بدلیں', '“{name}” تہہ منتخب کریں', 'متن کا انداز', 'رنگ', 'متن', 'رنگ بدلیں: {target}', 'رنگ منتخب کریں', 'فونٹ', 'وقفہ', 'چلائیں', 'تراشنے کا موڈ ضروری ہے', 'تراشنا منسوخ', 'ویڈیو تراشیں', 'تراشنا', 'آغاز', 'اختتام', 'کلپ کا آغاز', 'کلپ کا اختتام', 'زیادہ سے زیادہ {seconds} ث', 'لاگو کریں', 'پلے ہیڈ', 'ویڈیو کا موجودہ وقت', 'متن', 'شروع', 'ختم', 'متن کا آغاز', 'متن کا اختتام'],
  errors: ['یہ براؤزر WebCodecs کی حمایت نہیں کرتا۔', 'صرف MP4 اور MOV کنٹینر معاون ہیں۔', 'منتخب فائل میں ویڈیو ٹریک نہیں ہے۔', 'یہ ویڈیو کوڈیک براؤزر میں معاون نہیں ہے۔', 'ویڈیو ریزولوشن 4K حد (لمبی سمت 3840 px) سے زیادہ ہے۔', 'ویڈیو کا دورانیہ معلوم نہیں ہو سکا۔', 'آڈیو کوڈیک AAC-LC نہیں؛ ایکسپورٹ بغیر آواز ہوگا۔', 'یہ براؤزر WebCodecs یا OffscreenCanvas کی حمایت نہیں کرتا۔', 'ویڈیو ڈیکوڈر کی ترتیب نہیں مل سکی۔', 'مناسب H.264 انکوڈر دستیاب نہیں۔', 'ایکسپورٹ مکمل نہیں ہو سکا۔'],
});

const pl: BaseMessages = localisedCatalog({
  title: 'klex — napisy na wideo', home: 'Wróć na początek', tagline: 'napisy na wideo', language: 'Język', layer: { one: '{count} warstwa', few: '{count} warstwy', many: '{count} warstw', other: '{count} warstwy' }, export: 'Eksportuj', video: 'Wideo', overlays: 'Napisy', stepsLabel: 'Etapy projektu',
  hero: ['Edytor napisów', 'Dodaj', 'wyraziste', 'napisy bezpośrednio w przeglądarce.', 'Twoje wideo nigdy nie trafia na serwer.'], upload: ['Sprawdzanie wideo…', 'Upuść wideo tutaj', 'Kodek, czas trwania i rozdzielczość', 'lub kliknij, aby wybrać plik', 'do 4K', 'do {seconds} s na eksport'], privacy: ['Wideo pozostaje u Ciebie', 'Przetwarzanie odbywa się lokalnie w przeglądarce.'],
  editor: ['Krok 2 z 3', 'Ustaw czas, styl i położenie każdej warstwy.', 'Dodaj napis', 'Napisy', 'Brak tekstu', 'Usuń „{name}”', 'Kompozycja', 'Warstwy', 'Dodaj warstwę', '{value} s', 'Zmień wideo', 'Podgląd gotowy', 'Przygotowywanie podglądu…'],
  exportPanel: ['Ostatni krok', 'Gotowe do eksportu', 'Sprawdź ustawienia. Renderowanie odbywa się lokalnie, więc wideo pozostaje prywatne.', 'Plik', 'Fragment', 'Kompozycja', 'Jakość', 'Wybierz rozmiar', 'Wysoka', 'Do 1080p · 12 Mb/s', 'Najlepsza', 'Standardowa', 'Do 1080p · 8 Mb/s', 'Równowaga', 'Lekka', 'Do 720p · 4 Mb/s', 'Szybka', 'Plik zapisany. Możesz wyeksportować go ponownie.', 'Eksportuj MP4', 'Spróbuj ponownie w trybie lekkim', 'Wróć do edytora'],
  trim: ['Wymagane przycięcie', 'Wideo jest za długie', 'Aby kontynuować, wybierz fragment do {seconds} sekund.'], progress: ['Eksport', 'Renderowanie wideo', 'Tworzenie kompozycji', '{seconds} s · nie zamykaj tej karty', 'Anuluj'],
  inspector: ['Zawartość', 'Napis', 'Usuń', 'Usuń warstwę', 'Tekst', 'Wygląd', 'Typografia', 'Krój pisma', 'Bezszeryfowy', 'Szeryfowy', 'Mono', 'Rozmiar', 'Kolor tekstu', 'Tło', 'Obrys', 'Pojawianie', 'Zanikanie', 'Wyrównanie'],
  stage: ['Podgląd', 'Tekst aktywnego napisu', 'Przenieś napis', 'Edytuj styl', 'Wybierz warstwę „{name}”', 'Styl napisu', 'Kolor', 'Tekst', 'Zmień kolor: {target}', 'Wybierz kolor', 'Czcionka', 'Pauza', 'Odtwórz', 'Tryb przycinania jest wymagany', 'Anuluj przycinanie', 'Przytnij wideo', 'Przycinanie', 'Początek', 'Koniec', 'Początek fragmentu', 'Koniec fragmentu', 'Maksymalnie {seconds} s', 'Zastosuj', 'Kursor', 'Bieżący czas wideo', 'Napis', 'Start', 'Stop', 'Początek napisu', 'Koniec napisu'],
  errors: ['Ta przeglądarka nie obsługuje WebCodecs.', 'Obsługiwane są tylko kontenery MP4 i MOV.', 'Wybrany plik nie zawiera ścieżki wideo.', 'Ten kodek wideo nie jest obsługiwany przez przeglądarkę.', 'Rozdzielczość przekracza limit 4K (3840 px na dłuższym boku).', 'Nie udało się ustalić czasu trwania wideo.', 'Kodek audio nie jest AAC-LC; eksport będzie bez dźwięku.', 'Ta przeglądarka nie obsługuje WebCodecs ani OffscreenCanvas.', 'Nie udało się pobrać konfiguracji dekodera wideo.', 'Brak odpowiedniego kodera H.264 w tej przeglądarce.', 'Nie udało się ukończyć eksportu.'],
});

type CompactCatalog = {
  title: string; home: string; tagline: string; language: string; layer: Message; export: string; video: string; overlays: string; stepsLabel: string;
  hero: [string, string, string, string, string]; upload: [string, string, string, string, string, string]; privacy: [string, string];
  editor: [string, string, string, string, string, string, string, string, string, string, string, string, string];
  exportPanel: [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string];
  trim: [string, string, string]; progress: [string, string, string, string, string]; inspector: [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string];
  stage: [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string];
  errors: [string, string, string, string, string, string, string, string, string, string, string];
};

function localisedCatalog(c: CompactCatalog): BaseMessages {
  return {
    'meta.title': c.title, 'brand.home': c.home, 'brand.tagline': c.tagline, 'language.label': c.language, 'layer.count': c.layer, 'header.export': c.export,
    'steps.label': c.stepsLabel, 'steps.video': c.video, 'steps.overlays': c.overlays, 'steps.export': c.export,
    'hero.eyebrow': c.hero[0], 'hero.before': c.hero[1], 'hero.emphasis': c.hero[2], 'hero.after': c.hero[3], 'hero.subtitle': c.hero[4],
    'upload.checking': c.upload[0], 'upload.drop': c.upload[1], 'upload.checkingHint': c.upload[2], 'upload.selectHint': c.upload[3], 'upload.upTo4k': c.upload[4], 'upload.limit': c.upload[5], 'privacy.title': c.privacy[0], 'privacy.body': c.privacy[1],
    'editor.step': c.editor[0], 'editor.description': c.editor[1], 'editor.addOverlay': c.editor[2], 'editor.overlays': c.editor[3], 'editor.noText': c.editor[4], 'editor.removeNamed': c.editor[5], 'editor.composition': c.editor[6], 'editor.layers': c.editor[7], 'editor.addLayer': c.editor[8], 'editor.seconds': c.editor[9], 'editor.replaceVideo': c.editor[10], 'editor.previewReady': c.editor[11], 'editor.previewPreparing': c.editor[12],
    'export.finalStep': c.exportPanel[0], 'export.ready': c.exportPanel[1], 'export.description': c.exportPanel[2], 'export.file': c.exportPanel[3], 'export.clip': c.exportPanel[4], 'export.composition': c.exportPanel[5], 'export.quality': c.exportPanel[6], 'export.chooseSize': c.exportPanel[7], 'export.high': c.exportPanel[8], 'export.highDetail': c.exportPanel[9], 'export.best': c.exportPanel[10], 'export.standard': c.exportPanel[11], 'export.standardDetail': c.exportPanel[12], 'export.balance': c.exportPanel[13], 'export.light': c.exportPanel[14], 'export.lightDetail': c.exportPanel[15], 'export.fast': c.exportPanel[16], 'export.saved': c.exportPanel[17], 'export.button': c.exportPanel[18], 'export.retry': c.exportPanel[19], 'export.back': c.exportPanel[20],
    'trim.required': c.trim[0], 'trim.tooLong': c.trim[1], 'trim.choose': c.trim[2], 'progress.label': c.progress[0], 'progress.rendering': c.progress[1], 'progress.composing': c.progress[2], 'progress.elapsed': c.progress[3], 'common.cancel': c.progress[4],
    'inspector.content': c.inspector[0], 'inspector.caption': c.inspector[1], 'inspector.delete': c.inspector[2], 'inspector.deleteLayer': c.inspector[3], 'inspector.text': c.inspector[4], 'inspector.appearance': c.inspector[5], 'inspector.typography': c.inspector[6], 'inspector.typeface': c.inspector[7], 'font.sans': c.inspector[8], 'font.serif': c.inspector[9], 'font.mono': c.inspector[10], 'inspector.size': c.inspector[11], 'inspector.textColor': c.inspector[12], 'style.plate': c.inspector[13], 'style.stroke': c.inspector[14], 'style.fadeIn': c.inspector[15], 'style.fadeOut': c.inspector[16], 'style.alignment': c.inspector[17],
    'stage.preview': c.stage[0], 'stage.activeText': c.stage[1], 'stage.move': c.stage[2], 'stage.editStyle': c.stage[3], 'stage.selectLayer': c.stage[4], 'stage.captionStyle': c.stage[5], 'style.color': c.stage[6], 'style.text': c.stage[7], 'style.changeColor': c.stage[8], 'style.chooseColor': c.stage[9], 'style.font': c.stage[10], 'stage.pause': c.stage[11], 'stage.play': c.stage[12], 'stage.trimRequired': c.stage[13], 'stage.cancelTrim': c.stage[14], 'stage.trimVideo': c.stage[15], 'stage.trim': c.stage[16], 'stage.in': c.stage[17], 'stage.out': c.stage[18], 'stage.clipStart': c.stage[19], 'stage.clipEnd': c.stage[20], 'stage.maxDuration': c.stage[21], 'stage.apply': c.stage[22], 'stage.playhead': c.stage[23], 'stage.currentTime': c.stage[24], 'stage.caption': c.stage[25], 'stage.start': c.stage[26], 'stage.stop': c.stage[27], 'stage.captionStart': c.stage[28], 'stage.captionEnd': c.stage[29],
    'error.webCodecs': c.errors[0], 'error.container': c.errors[1], 'error.noVideo': c.errors[2], 'error.videoCodec': c.errors[3], 'error.resolution': c.errors[4], 'error.duration': c.errors[5], 'error.audio': c.errors[6], 'error.capabilities': c.errors[7], 'error.decoder': c.errors[8], 'error.encoder': c.errors[9], 'error.generic': c.errors[10],
  };
}

const scenarioEn = {
  'steps.files': 'Files',
  'steps.position': 'Position',
  'scenario.eyebrow': 'Choose a workflow',
  'scenario.title': 'What would you like to add?',
  'scenario.subtitle': 'Pick a workflow. Everything stays in this browser.',
  'scenario.text.meta': 'One video',
  'scenario.text.title': 'Add text',
  'scenario.text.description': 'Create timed text overlays on one video.',
  'scenario.logo.meta': 'One or more videos',
  'scenario.logo.title': 'Add a logo',
  'scenario.logo.description': 'Place one Logo across one or more videos.',
  'scenario.confirmDiscard': 'Leave this workflow? Your current work will be lost.',
} as const satisfies Record<string, Message>;

type ScenarioMessageKey = keyof typeof scenarioEn;
type ScenarioMessages = Record<ScenarioMessageKey, Message>;

const scenarioCatalogs: Record<Locale, ScenarioMessages> = {
  en: scenarioEn,
  es: {
    'steps.files': 'Archivos', 'steps.position': 'Posición', 'scenario.eyebrow': 'Elige un flujo', 'scenario.title': '¿Qué quieres añadir?', 'scenario.subtitle': 'Elige un flujo. Todo permanece en este navegador.',
    'scenario.text.meta': 'Un vídeo', 'scenario.text.title': 'Añadir texto', 'scenario.text.description': 'Crea textos temporizados en un vídeo.',
    'scenario.logo.meta': 'Uno o más vídeos', 'scenario.logo.title': 'Añadir un logotipo', 'scenario.logo.description': 'Coloca un logotipo en uno o varios vídeos.', 'scenario.confirmDiscard': '¿Salir de este flujo? Se perderá tu trabajo actual.',
  },
  zh: {
    'steps.files': '文件', 'steps.position': '位置', 'scenario.eyebrow': '选择工作流程', 'scenario.title': '您想添加什么？', 'scenario.subtitle': '请选择工作流程。所有内容都保留在此浏览器中。',
    'scenario.text.meta': '一个视频', 'scenario.text.title': '添加文字', 'scenario.text.description': '为一个视频创建定时文字叠加。',
    'scenario.logo.meta': '一个或多个视频', 'scenario.logo.title': '添加标志', 'scenario.logo.description': '将一个标志应用到一个或多个视频。', 'scenario.confirmDiscard': '要离开此工作流程吗？当前工作将会丢失。',
  },
  hi: {
    'steps.files': 'फ़ाइलें', 'steps.position': 'स्थान', 'scenario.eyebrow': 'वर्कफ़्लो चुनें', 'scenario.title': 'आप क्या जोड़ना चाहते हैं?', 'scenario.subtitle': 'वर्कफ़्लो चुनें। सब कुछ इसी ब्राउज़र में रहता है।',
    'scenario.text.meta': 'एक वीडियो', 'scenario.text.title': 'टेक्स्ट जोड़ें', 'scenario.text.description': 'एक वीडियो पर समयबद्ध टेक्स्ट जोड़ें।',
    'scenario.logo.meta': 'एक या अधिक वीडियो', 'scenario.logo.title': 'लोगो जोड़ें', 'scenario.logo.description': 'एक लोगो को एक या अधिक वीडियो पर लगाएँ।', 'scenario.confirmDiscard': 'इस वर्कफ़्लो से बाहर जाएँ? आपका मौजूदा काम खो जाएगा।',
  },
  ar: {
    'steps.files': 'الملفات', 'steps.position': 'الموضع', 'scenario.eyebrow': 'اختر مسار العمل', 'scenario.title': 'ماذا تريد أن تضيف؟', 'scenario.subtitle': 'اختر مسارًا. يبقى كل شيء في هذا المتصفح.',
    'scenario.text.meta': 'فيديو واحد', 'scenario.text.title': 'إضافة نص', 'scenario.text.description': 'أنشئ نصوصًا موقّتة على فيديو واحد.',
    'scenario.logo.meta': 'فيديو واحد أو أكثر', 'scenario.logo.title': 'إضافة شعار', 'scenario.logo.description': 'ضع شعارًا واحدًا على فيديو واحد أو أكثر.', 'scenario.confirmDiscard': 'هل تريد مغادرة هذا المسار؟ سيُفقد عملك الحالي.',
  },
  pt: {
    'steps.files': 'Ficheiros', 'steps.position': 'Posição', 'scenario.eyebrow': 'Escolha um fluxo', 'scenario.title': 'O que pretende adicionar?', 'scenario.subtitle': 'Escolha um fluxo. Tudo permanece neste navegador.',
    'scenario.text.meta': 'Um vídeo', 'scenario.text.title': 'Adicionar texto', 'scenario.text.description': 'Crie textos temporizados num vídeo.',
    'scenario.logo.meta': 'Um ou mais vídeos', 'scenario.logo.title': 'Adicionar um logótipo', 'scenario.logo.description': 'Aplique um logótipo a um ou mais vídeos.', 'scenario.confirmDiscard': 'Sair deste fluxo? O trabalho atual será perdido.',
  },
  bn: {
    'steps.files': 'ফাইল', 'steps.position': 'অবস্থান', 'scenario.eyebrow': 'কাজের ধরণ বেছে নিন', 'scenario.title': 'আপনি কী যোগ করতে চান?', 'scenario.subtitle': 'একটি কাজের ধরণ বেছে নিন। সবকিছু এই ব্রাউজারেই থাকে।',
    'scenario.text.meta': 'একটি ভিডিও', 'scenario.text.title': 'টেক্সট যোগ করুন', 'scenario.text.description': 'একটি ভিডিওতে সময় নির্ধারিত টেক্সট যোগ করুন।',
    'scenario.logo.meta': 'এক বা একাধিক ভিডিও', 'scenario.logo.title': 'লোগো যোগ করুন', 'scenario.logo.description': 'এক বা একাধিক ভিডিওতে একটি লোগো বসান।', 'scenario.confirmDiscard': 'এই কাজ থেকে বের হবেন? আপনার বর্তমান কাজ হারিয়ে যাবে।',
  },
  ru: {
    'steps.files': 'Файлы', 'steps.position': 'Позиция', 'scenario.eyebrow': 'Выберите сценарий', 'scenario.title': 'Что вы хотите добавить?', 'scenario.subtitle': 'Выберите сценарий. Всё останется в этом браузере.',
    'scenario.text.meta': 'Одно видео', 'scenario.text.title': 'Добавить текст', 'scenario.text.description': 'Создайте надписи с таймингом для одного видео.',
    'scenario.logo.meta': 'Одно или несколько видео', 'scenario.logo.title': 'Добавить логотип', 'scenario.logo.description': 'Разместите один Логотип на одном или нескольких видео.', 'scenario.confirmDiscard': 'Выйти из этого сценария? Текущая работа будет потеряна.',
  },
  ja: {
    'steps.files': 'ファイル', 'steps.position': '位置', 'scenario.eyebrow': 'ワークフローを選択', 'scenario.title': '何を追加しますか？', 'scenario.subtitle': 'ワークフローを選んでください。すべてこのブラウザ内で処理されます。',
    'scenario.text.meta': '動画1本', 'scenario.text.title': 'テキストを追加', 'scenario.text.description': '1本の動画に時間指定のテキストを追加します。',
    'scenario.logo.meta': '1本以上の動画', 'scenario.logo.title': 'ロゴを追加', 'scenario.logo.description': '1つのロゴを1本以上の動画に配置します。', 'scenario.confirmDiscard': 'このワークフローを終了しますか？現在の作業は失われます。',
  },
  fr: {
    'steps.files': 'Fichiers', 'steps.position': 'Position', 'scenario.eyebrow': 'Choisissez un parcours', 'scenario.title': 'Que souhaitez-vous ajouter ?', 'scenario.subtitle': 'Choisissez un parcours. Tout reste dans ce navigateur.',
    'scenario.text.meta': 'Une vidéo', 'scenario.text.title': 'Ajouter du texte', 'scenario.text.description': 'Créez des textes minutés sur une vidéo.',
    'scenario.logo.meta': 'Une ou plusieurs vidéos', 'scenario.logo.title': 'Ajouter un logo', 'scenario.logo.description': 'Placez un logo sur une ou plusieurs vidéos.', 'scenario.confirmDiscard': 'Quitter ce parcours ? Votre travail actuel sera perdu.',
  },
  de: {
    'steps.files': 'Dateien', 'steps.position': 'Position', 'scenario.eyebrow': 'Arbeitsablauf wählen', 'scenario.title': 'Was möchtest du hinzufügen?', 'scenario.subtitle': 'Wähle einen Ablauf. Alles bleibt in diesem Browser.',
    'scenario.text.meta': 'Ein Video', 'scenario.text.title': 'Text hinzufügen', 'scenario.text.description': 'Erstelle zeitgesteuerte Texte für ein Video.',
    'scenario.logo.meta': 'Ein oder mehrere Videos', 'scenario.logo.title': 'Logo hinzufügen', 'scenario.logo.description': 'Platziere ein Logo auf einem oder mehreren Videos.', 'scenario.confirmDiscard': 'Diesen Ablauf verlassen? Deine aktuelle Arbeit geht verloren.',
  },
  id: {
    'steps.files': 'File', 'steps.position': 'Posisi', 'scenario.eyebrow': 'Pilih alur kerja', 'scenario.title': 'Apa yang ingin Anda tambahkan?', 'scenario.subtitle': 'Pilih alur kerja. Semuanya tetap di browser ini.',
    'scenario.text.meta': 'Satu video', 'scenario.text.title': 'Tambahkan teks', 'scenario.text.description': 'Buat teks berwaktu pada satu video.',
    'scenario.logo.meta': 'Satu atau beberapa video', 'scenario.logo.title': 'Tambahkan logo', 'scenario.logo.description': 'Tempatkan satu logo pada satu atau beberapa video.', 'scenario.confirmDiscard': 'Keluar dari alur ini? Pekerjaan Anda saat ini akan hilang.',
  },
  tr: {
    'steps.files': 'Dosyalar', 'steps.position': 'Konum', 'scenario.eyebrow': 'Bir akış seç', 'scenario.title': 'Ne eklemek istersin?', 'scenario.subtitle': 'Bir akış seç. Her şey bu tarayıcıda kalır.',
    'scenario.text.meta': 'Bir video', 'scenario.text.title': 'Metin ekle', 'scenario.text.description': 'Bir videoya zamanlanmış metinler ekle.',
    'scenario.logo.meta': 'Bir veya daha fazla video', 'scenario.logo.title': 'Logo ekle', 'scenario.logo.description': 'Bir logoyu bir veya daha fazla videoya yerleştir.', 'scenario.confirmDiscard': 'Bu akıştan çıkılsın mı? Mevcut çalışman kaybolacak.',
  },
  ur: {
    'steps.files': 'فائلیں', 'steps.position': 'مقام', 'scenario.eyebrow': 'کام کا طریقہ منتخب کریں', 'scenario.title': 'آپ کیا شامل کرنا چاہتے ہیں؟', 'scenario.subtitle': 'ایک طریقہ منتخب کریں۔ سب کچھ اسی براؤزر میں رہتا ہے۔',
    'scenario.text.meta': 'ایک ویڈیو', 'scenario.text.title': 'متن شامل کریں', 'scenario.text.description': 'ایک ویڈیو پر وقت کے مطابق متن شامل کریں۔',
    'scenario.logo.meta': 'ایک یا زیادہ ویڈیوز', 'scenario.logo.title': 'لوگو شامل کریں', 'scenario.logo.description': 'ایک لوگو کو ایک یا زیادہ ویڈیوز پر لگائیں۔', 'scenario.confirmDiscard': 'اس طریقے سے باہر جائیں؟ آپ کا موجودہ کام ضائع ہو جائے گا۔',
  },
  pl: {
    'steps.files': 'Pliki', 'steps.position': 'Pozycja', 'scenario.eyebrow': 'Wybierz tryb pracy', 'scenario.title': 'Co chcesz dodać?', 'scenario.subtitle': 'Wybierz tryb. Wszystko pozostaje w tej przeglądarce.',
    'scenario.text.meta': 'Jedno wideo', 'scenario.text.title': 'Dodaj tekst', 'scenario.text.description': 'Utwórz napisy czasowe na jednym wideo.',
    'scenario.logo.meta': 'Jedno lub więcej wideo', 'scenario.logo.title': 'Dodaj logo', 'scenario.logo.description': 'Umieść jedno logo na jednym lub kilku wideo.', 'scenario.confirmDiscard': 'Opuścić ten tryb? Bieżąca praca zostanie utracona.',
  },
};

const logoEn = {
  'logo.filesEyebrow': 'Logo workflow · step 1',
  'logo.filesTitle': 'Choose a Logo and videos',
  'logo.filesDescription': 'Build a Batch in several selections or drops. Every file stays in this browser and is checked independently.',
  'logo.imageLabel': 'Logo image',
  'logo.videoLabel': 'Source videos',
  'logo.imageDrop': 'Drop a Logo here',
  'logo.imageHint': 'or click to choose an image',
  'logo.imageLimits': 'PNG, WebP or JPEG · up to 20 MB · 4096 px',
  'logo.videoDrop': 'Drop videos here',
  'logo.videoHint': 'or click to add one or more videos',
  'logo.videoLimits': 'MP4 or MOV · up to 4K · up to {seconds}s',
  'logo.selected': 'Selected',
  'logo.batchLabel': 'Videos in this Batch',
  'logo.batchChecking': 'Checking container, tracks, codecs, resolution and duration…',
  'logo.batchMetadata': '{duration} · {width}×{height}',
  'logo.batchStatus.validating': 'Checking',
  'logo.batchStatus.supported': 'Supported',
  'logo.batchStatus.warning': 'Warning',
  'logo.batchStatus.error': 'Error',
  'logo.batchRemove': 'Remove “{name}” from the Batch',
  'logo.batchSupported': { one: '{count} supported video', other: '{count} supported videos' },
  'logo.batchContinue': 'Continue',
  'logo.exportQueue': 'Batch export queue',
  'logo.retryQueue': 'Failed-item retry queue',
  'logo.exportStatus.queued': 'Queued',
  'logo.exportStatus.processing': 'Processing',
  'logo.exportStatus.ready': 'Ready',
  'logo.exportStatus.error': 'Failed',
  'logo.exportStatus.skipped': 'Skipped',
  'logo.exportOverall': 'Overall Batch progress',
  'logo.retryOverall': 'Retry progress',
  'logo.retryFailed': 'Retry failed videos',
  'logo.cancelConfirm': 'Cancel this Batch export? Current encoding, queued videos, and temporary results will be discarded. Your files and Logo settings will stay in the editor.',
  'logo.cancelling': 'Removing temporary export files…',
  'logo.exportComplete': 'Every video in the Batch was exported successfully.',
  'logo.exportPartial': 'The successful videos were downloaded. Some videos could not be exported.',
  'logo.exportNone': 'No videos were exported, so no download was created.',
  'logo.exportSummary': '{ready} ready · {error} failed · {skipped} skipped',
  'logo.storageChecking': 'Checking available browser storage…',
  'logo.storageInsufficient': 'Not enough browser storage: about {required} required, {available} available.',
  'logo.storageUnavailable': 'This browser cannot report or provide the storage required for a safe Batch export.',
  'logo.storageRetry': 'Check storage again',
  'logo.previewAlt': 'Selected Logo',
  'logo.previewEyebrow': 'Logo workflow · step 2',
  'logo.previewTitle': 'Default position',
  'logo.previewDescription': 'The real video preview uses the same geometry as the MP4 export.',
  'logo.batchDefault': 'Batch Default',
  'logo.batchDefaultDescription': 'Edit the common Logo settings inherited by every supported video in this Batch.',
  'logo.batchDefaultNotVideo': 'Common Batch settings · not a video frame',
  'logo.previewTarget': 'Preview target',
  'logo.returnToBatchDefault': 'Return to Batch Default',
  'logo.defaults': 'Logo defaults',
  'logo.settings': 'Exact settings',
  'logo.positionAppearance': 'Position and appearance',
  'logo.anchor': 'Anchor',
  'logo.anchorTopLeft': 'Top left',
  'logo.anchorTopRight': 'Top right',
  'logo.anchorCenter': 'Center',
  'logo.anchorBottomLeft': 'Bottom left',
  'logo.anchorBottomRight': 'Bottom right',
  'logo.offsetX': 'X Offset',
  'logo.offsetY': 'Y Offset',
  'logo.size': 'Size',
  'logo.safeMargin': 'Safe Margin',
  'logo.opacity': 'Opacity',
  'logo.minimumMaximum': 'Min {min} · max {max}',
  'logo.videoOverride': 'Video Override',
  'logo.overrideDescription': 'Only changed properties stop inheriting the Batch Default.',
  'logo.overridden': 'Overridden',
  'logo.fitted': 'Fitted',
  'logo.resetProperty': 'Reset {property}',
  'logo.resetAll': 'Reset all',
  'logo.replaceFiles': 'Replace files',
  'logo.fullVideo': 'Full video',
  'error.logoType': 'The Logo must be an encoded PNG, WebP or JPEG image.',
  'error.logoSize': 'The Logo exceeds the 20 MB file-size limit.',
  'error.logoDimensions': 'The Logo exceeds the 4096 px limit on one or both sides.',
  'error.logoDecode': 'The Logo image is damaged or cannot be decoded by this browser.',
  'error.logoVideoDuration': 'Logo videos must be no longer than {seconds} seconds.',
} as const satisfies Record<string, Message>;

type LogoMessageKey = keyof typeof logoEn;
type LogoMessages = Record<LogoMessageKey, Message>;

const logoRu: LogoMessages = {
  'logo.filesEyebrow': 'Сценарий Логотипа · шаг 1',
  'logo.filesTitle': 'Выберите Логотип и видео',
  'logo.filesDescription': 'Соберите Пакет несколькими выборами или перетаскиваниями. Каждый файл останется в браузере и проверяется независимо.',
  'logo.imageLabel': 'Изображение Логотипа',
  'logo.videoLabel': 'Исходные видео',
  'logo.imageDrop': 'Перетащите Логотип сюда',
  'logo.imageHint': 'или нажмите, чтобы выбрать изображение',
  'logo.imageLimits': 'PNG, WebP или JPEG · до 20 МБ · до 4096 px',
  'logo.videoDrop': 'Перетащите видео сюда',
  'logo.videoHint': 'или нажмите, чтобы добавить одно или несколько видео',
  'logo.videoLimits': 'MP4 или MOV · до 4K · до {seconds}с',
  'logo.selected': 'Выбрано',
  'logo.batchLabel': 'Видео в этом Пакете',
  'logo.batchChecking': 'Проверяем контейнер, дорожки, codec, разрешение и длительность…',
  'logo.batchMetadata': '{duration} · {width}×{height}',
  'logo.batchStatus.validating': 'Проверяется',
  'logo.batchStatus.supported': 'Поддерживается',
  'logo.batchStatus.warning': 'Предупреждение',
  'logo.batchStatus.error': 'Ошибка',
  'logo.batchRemove': 'Удалить «{name}» из Пакета',
  'logo.batchSupported': { one: '{count} поддерживаемое видео', few: '{count} поддерживаемых видео', many: '{count} поддерживаемых видео', other: '{count} поддерживаемого видео' },
  'logo.batchContinue': 'Продолжить',
  'logo.exportQueue': 'Очередь экспорта Пакета',
  'logo.retryQueue': 'Очередь повторной попытки',
  'logo.exportStatus.queued': 'В очереди',
  'logo.exportStatus.processing': 'Обрабатывается',
  'logo.exportStatus.ready': 'Готово',
  'logo.exportStatus.error': 'Ошибка',
  'logo.exportStatus.skipped': 'Пропущено',
  'logo.exportOverall': 'Общий прогресс Пакета',
  'logo.retryOverall': 'Прогресс повторной попытки',
  'logo.retryFailed': 'Повторить видео с ошибкой',
  'logo.cancelConfirm': 'Отменить экспорт Пакета? Текущее кодирование, очередь и временные результаты будут удалены. Файлы и настройки Логотипа останутся в редакторе.',
  'logo.cancelling': 'Удаляем временные файлы экспорта…',
  'logo.exportComplete': 'Все видео Пакета успешно экспортированы.',
  'logo.exportPartial': 'Успешные видео скачаны. Часть видео не удалось экспортировать.',
  'logo.exportNone': 'Не удалось экспортировать ни одного видео, поэтому скачивание не началось.',
  'logo.exportSummary': 'Готово: {ready} · с ошибкой: {error} · пропущено: {skipped}',
  'logo.storageChecking': 'Проверяем доступное место в хранилище браузера…',
  'logo.storageInsufficient': 'Недостаточно места в хранилище браузера: требуется примерно {required}, доступно {available}.',
  'logo.storageUnavailable': 'Этот браузер не может сообщить или предоставить объём хранилища, необходимый для безопасного экспорта Пакета.',
  'logo.storageRetry': 'Проверить место ещё раз',
  'logo.previewAlt': 'Выбранный Логотип',
  'logo.previewEyebrow': 'Сценарий Логотипа · шаг 2',
  'logo.previewTitle': 'Положение по умолчанию',
  'logo.previewDescription': 'Реальный предпросмотр использует ту же геометрию, что и экспорт MP4.',
  'logo.batchDefault': 'Настройки Пакета',
  'logo.batchDefaultDescription': 'Измените общие настройки Логотипа, которые наследует каждое поддерживаемое видео Пакета.',
  'logo.batchDefaultNotVideo': 'Общие настройки Пакета · не кадр видео',
  'logo.previewTarget': 'Цель предпросмотра',
  'logo.returnToBatchDefault': 'Вернуться к Настройкам Пакета',
  'logo.defaults': 'Настройки Логотипа по умолчанию',
  'logo.settings': 'Точные настройки',
  'logo.positionAppearance': 'Положение и вид',
  'logo.anchor': 'Якорь',
  'logo.anchorTopLeft': 'Верхний левый',
  'logo.anchorTopRight': 'Верхний правый',
  'logo.anchorCenter': 'Центр',
  'logo.anchorBottomLeft': 'Нижний левый',
  'logo.anchorBottomRight': 'Нижний правый',
  'logo.offsetX': 'Смещение X',
  'logo.offsetY': 'Смещение Y',
  'logo.size': 'Размер',
  'logo.safeMargin': 'Безопасный отступ',
  'logo.opacity': 'Непрозрачность',
  'logo.minimumMaximum': 'Мин. {min} · макс. {max}',
  'logo.videoOverride': 'Переопределение видео',
  'logo.overrideDescription': 'Только изменённые свойства перестают наследовать Настройки Пакета.',
  'logo.overridden': 'Переопределено',
  'logo.fitted': 'Подогнано',
  'logo.resetProperty': 'Сбросить «{property}»',
  'logo.resetAll': 'Сбросить всё',
  'logo.replaceFiles': 'Заменить файлы',
  'logo.fullVideo': 'Полное видео',
  'error.logoType': 'Логотип должен быть изображением в формате PNG, WebP или JPEG.',
  'error.logoSize': 'Размер файла Логотипа превышает 20 МБ.',
  'error.logoDimensions': 'Одна или обе стороны Логотипа превышают 4096 px.',
  'error.logoDecode': 'Логотип повреждён или не декодируется этим браузером.',
  'error.logoVideoDuration': 'Видео для Логотипа должно быть не длиннее {seconds} секунд.',
};

export type MessageKey = BaseMessageKey | ScenarioMessageKey | LogoMessageKey;
type Messages = Record<MessageKey, Message>;

const baseCatalogs: Record<Locale, BaseMessages> = { en, es, zh, hi, ar, pt, bn, ru, ja, fr, de, id, tr, ur, pl };
const storageErrors: Record<Locale, string> = {
  en: 'This browser cannot provide the temporary storage required for export.',
  es: 'Este navegador no puede proporcionar el almacenamiento temporal necesario para exportar.',
  zh: '此浏览器无法提供导出所需的临时存储空间。',
  hi: 'यह ब्राउज़र एक्सपोर्ट के लिए आवश्यक अस्थायी स्टोरेज उपलब्ध नहीं करा सकता।',
  ar: 'لا يستطيع هذا المتصفح توفير التخزين المؤقت المطلوب للتصدير.',
  pt: 'Este navegador não oferece o armazenamento temporário necessário para exportar.',
  bn: 'এই ব্রাউজার এক্সপোর্টের জন্য প্রয়োজনীয় অস্থায়ী স্টোরেজ দিতে পারে না।',
  ru: 'Этот браузер не предоставляет временное хранилище, необходимое для экспорта.',
  ja: 'このブラウザーでは、書き出しに必要な一時ストレージを利用できません。',
  fr: 'Ce navigateur ne fournit pas le stockage temporaire requis pour l’export.',
  de: 'Dieser Browser kann den für den Export erforderlichen temporären Speicher nicht bereitstellen.',
  id: 'Browser ini tidak menyediakan penyimpanan sementara yang diperlukan untuk ekspor.',
  tr: 'Bu tarayıcı dışa aktarma için gereken geçici depolamayı sağlayamıyor.',
  ur: 'یہ براؤزر ایکسپورٹ کے لیے درکار عارضی اسٹوریج فراہم نہیں کر سکتا۔',
  pl: 'Ta przeglądarka nie udostępnia pamięci tymczasowej wymaganej do eksportu.',
};
const logoCatalogs: Partial<Record<Locale, LogoMessages>> = { en: logoEn, ru: logoRu };
const catalogs = languages.reduce<Record<Locale, Messages>>((result, { code }) => {
  result[code] = {
    ...baseCatalogs[code],
    ...scenarioCatalogs[code],
    ...(logoCatalogs[code] ?? logoEn),
    'error.storage': storageErrors[code],
  };
  return result;
}, {} as Record<Locale, Messages>);
const rtlLocales = new Set<Locale>(['ar', 'ur']);
const storageKey = 'klex-locale';

function isLocale(value: string): value is Locale {
  return languages.some(({ code }) => code === value);
}

export function detectLocale(preferred: readonly string[] = typeof navigator === 'undefined'
  ? []
  : navigator.languages.length ? navigator.languages : [navigator.language]): Locale {
  for (const candidate of preferred) {
    const base = candidate.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return 'en';
}

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
  return saved && isLocale(saved) ? saved : detectLocale();
}

const localeState = writable<Locale>(initialLocale());
export const locale = { subscribe: localeState.subscribe };

localeState.subscribe((value) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = value;
  document.documentElement.dir = rtlLocales.has(value) ? 'rtl' : 'ltr';
});

export function setLocale(value: Locale) {
  localeState.set(value);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(storageKey, value); } catch { /* The selection still applies for this session. */ }
  }
}

export type Translate = (key: MessageKey, params?: Params) => string;

export const t = derived(locale, ($locale): Translate => {
  const PluralRules = (Intl as typeof Intl & {
    PluralRules: new (locale: string) => { select(value: number): PluralCategory };
  }).PluralRules;
  const pluralRules = new PluralRules($locale);
  return (key, params = {}) => {
    const message = catalogs[$locale][key] ?? catalogs.en[key];
    const template = typeof message === 'string'
      ? message
      : message[pluralRules.select(Number(params.count ?? 0))] ?? message.other;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
  };
});

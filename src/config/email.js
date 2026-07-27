const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const Membre = require('../models/Membre');
const SiteConfig = require('../models/SiteConfig');

const MEMBER_TOKEN_EXPIRY = process.env.MEMBER_TOKEN_EXPIRY || '30d';

const generateMemberToken = (membre) => {
  return jwt.sign(
    { id: membre._id, role: membre.role, type: 'member-link' },
    process.env.JWT_SECRET,
    { expiresIn: MEMBER_TOKEN_EXPIRY }
  );
};

const getMemberLink = (membre, page = 'dashboard') => {
  const token = generateMemberToken(membre);
  return `${FRONTEND_URL}/auth/member-link?token=${token}&page=${page}`;
};

const FRONTEND_URL = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')[0].trim()
  : 'http://localhost:5173';

// ============================================================
// SVG ICONS - Professionnels, compatibles email
// ============================================================

const SVG = {
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0097D7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01 9 11.01"/></svg>`,
  cross: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  document: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
  clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EDBE38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  megaphone: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  newspaper: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9h2"/><path d="M18 14h-8M18 10h-8M10 6h4"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  link: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  tag: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><path d="M7 7h.01"/></svg>`,
  pin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  upload: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><path d="M12 3v12"/></svg>`,
  refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
  pause: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M10 15V9M14 15V9"/></svg>`,
  handshake: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A67B1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>`,
};

// ============================================================
// STYLES PARTAGÉS
// ============================================================

const STYLES = {
  container: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);',
  headerBar: 'background: linear-gradient(135deg, #3A67B1 0%, #2e528e 40%, #0A0F29 100%); padding: 30px 24px; text-align: center;',
  headerTitle: 'color: #ffffff; font-size: 20px; font-weight: 700; margin: 8px 0 0 0; letter-spacing: -0.3px;',
  headerSub: 'color: rgba(255,255,255,0.7); font-size: 13px; margin: 4px 0 0 0;',
  body: 'padding: 28px 24px; background: #ffffff;',
  footer: 'background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;',
  footerText: 'color: #94a3b8; font-size: 11px; margin: 2px 0;',
  btn: 'display: inline-block; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;',
  btnPrimary: 'background: #3A67B1; color: #ffffff;',
  btnSuccess: 'background: #22C55E; color: #ffffff;',
  btnDanger: 'background: #EF4444; color: #ffffff;',
  btnOutline: 'background: transparent; border: 1.5px solid #3A67B1; color: #3A67B1;',
  card: 'background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;',
  cardGreen: 'background: #f0fdf4; border-left: 4px solid #22C55E; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #bbf7d0;',
  cardYellow: 'background: #fffbeb; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #fde68a;',
  cardRed: 'background: #fef2f2; border-left: 4px solid #EF4444; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #fecaca;',
  label: 'color: #64748b; font-size: 13px; font-weight: 600; display: inline-block; width: 90px;',
  value: 'color: #1e293b; font-size: 14px;',
  divider: 'border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;',
  greeting: 'color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 6px 0;',
  paragraph: 'color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;',
  row: 'margin: 6px 0;',
};

// ============================================================
// LAYOUT COMMUN
// ============================================================

const emailLayout = (title, content) => `
  <div style="${STYLES.container}">
    <div style="${STYLES.headerBar}">
      <div style="margin-bottom: 4px;">${SVG.star}</div>
      <h1 style="${STYLES.headerTitle}">${title}</h1>
      <p style="${STYLES.headerSub}">JCI Sidi Mansour</p>
    </div>
    <div style="${STYLES.body}">
      ${content}
    </div>
    <div style="${STYLES.footer}">
      <p style="${STYLES.footerText}">Cet email a été envoyé automatiquement par la plateforme JCI Sidi Mansour.</p>
    </div>
  </div>
`;

const iconTag = (svg, label) => `
  <div style="display: flex; align-items: flex-start; gap: 10px; margin: 6px 0;">
    <div style="flex-shrink: 0; width: 24px; height: 24px; margin-top: 1px;">${svg}</div>
    <div style="flex: 1;">
      <strong style="color: #64748b; font-size: 13px; font-weight: 600;">${label}</strong>
    </div>
  </div>
`;

const iconValue = (svg, label, value) => `
  <div style="display: flex; align-items: flex-start; gap: 10px; margin: 6px 0;">
    <div style="flex-shrink: 0; width: 24px; height: 24px; margin-top: 1px;">${svg}</div>
    <div style="flex: 1;">
      <strong style="color: #64748b; font-size: 13px; font-weight: 600;">${label}:</strong>
      <span style="color: #1e293b; font-size: 14px; margin-left: 4px;">${value}</span>
    </div>
  </div>
`;

// ============================================================
// TRANSPORTEUR NODEMAILER — Configuration via variables d'environnement
// ============================================================

let transporter = null;
let smtpReady = false;

console.log('');
console.log('=== SMTP CONFIGURATION ===');
console.log('Host: ' + (process.env.EMAIL_HOST || 'non défini'));
console.log('Port: ' + (process.env.EMAIL_PORT || 'non défini'));
console.log('User configuré: ' + (process.env.EMAIL_USER ? 'oui' : 'non'));
console.log('');

const initSMTP = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Variables SMTP incomplètes — emails désactivés');
    return;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });

  transporter.verify()
    .then(() => {
      smtpReady = true;
      console.log('✅ SMTP connecté');
    })
    .catch((err) => {
      smtpReady = false;
      console.log('❌ SMTP indisponible');
      console.log('  host: ' + process.env.EMAIL_HOST);
      console.log('  port: ' + process.env.EMAIL_PORT);
      console.log('  code: ' + (err.code || 'N/A'));
      console.log('  message: ' + (err.message || err));
      transporter = nodemailer.createTransport({ jsonTransport: true });
    });
};

// Initialisation au démarrage — ne bloque jamais le serveur
initSMTP();

// ============================================================
// FONCTION PRINCIPALE D'ENVOI
// ============================================================

const sendEmail = async (to, subject, html, text) => {
  if (!smtpReady) {
    console.log('⏳ SMTP indisponible, email non envoyé à', to);
    return null;
  }
  try {
    const mailOptions = {
      from: `"JCI Sidi Mansour" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: html || text,
      text: text || html
    };
    await transporter.sendMail(mailOptions);
    console.log('📧 Email envoyé avec succès à', to);
    return true;
  } catch (error) {
    console.log('❌ Erreur envoi email à', to, ':', error.message);
    return null;
  }
};

// ============================================================
// 1. INSCRIPTION - CONFIRMATION AU MEMBRE
// ============================================================

const sendRegistrationEmail = async (email, nom, prenom, token) => {
  const subject = 'Inscription - JCI Sidi Mansour';
  const verifyLink = `${FRONTEND_URL}/verify-email?token=${token}`;
  const html = emailLayout('Inscription reçue', `
    <p style="${STYLES.greeting}">Bonjour <strong>${prenom} ${nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Votre inscription a été reçue avec succès. Veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${verifyLink}" style="${STYLES.btn} ${STYLES.btnPrimary}">Vérifier mon email</a>
    </div>
    <p style="${STYLES.paragraph}">Ce lien expire dans <strong>24 heures</strong>.</p>
    <div style="${STYLES.cardYellow}">
      ${iconTag(SVG.info, 'Votre compte est actuellement en attente de validation par le Président. Vous recevrez une notification dès qu\'il sera activé.')}
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 2. INSCRIPTION - NOTIFICATION AU PRÉSIDENT
// ============================================================

const sendNewMemberNotificationToPresident = async (presidentEmail, membre) => {
  const subject = `Nouvelle inscription: ${membre.prenom} ${membre.nom}`;
  let presidentToken = '';
  try {
    const president = await Membre.findOne({ email: presidentEmail });
    if (president) {
      presidentToken = jwt.sign({ id: president._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    }
  } catch {}
  const html = emailLayout('Nouvelle inscription', `
    <p style="${STYLES.paragraph}">Un nouveau membre s'est inscrit et attend votre validation.</p>
    <div style="${STYLES.card}">
      ${iconValue(SVG.user, 'Nom', `${membre.nom} ${membre.prenom}`)}
      ${iconValue(SVG.mail, 'Email', membre.email)}
      ${iconValue(SVG.phone, 'Téléphone', membre.telephone || 'Non renseigné')}
      ${iconValue(SVG.tag, 'Situation', membre.situationProfessionnelle || 'Non renseigné')}
    </div>
    <div style="text-align: center; margin: 12px 0;">
      <a href="${FRONTEND_URL}/auth/president-link?token=${presidentToken}&tab=entretiens" style="${STYLES.btn} ${STYLES.btnOutline}">Gérer les inscriptions</a>
    </div>
  `);
  return sendEmail(presidentEmail, subject, html);
};

// ============================================================
// 3. VALIDATION ACCEPTÉE + ENTRETIEN
// ============================================================

const sendValidationAcceptedEmail = async (membre, entretien) => {
  const subject = 'Compte validé - JCI Sidi Mansour';
  const html = emailLayout('Compte validé', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Félicitations ! Votre compte JCI Sidi Mansour a été validé par le Président. Vous pouvez maintenant accéder à votre espace personnel.</p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${getMemberLink(membre, 'dashboard')}" style="${STYLES.btn} ${STYLES.btnPrimary}">Accéder à mon espace</a>
    </div>
    <div style="${STYLES.cardGreen}">
      <h3 style="color: #22C55E; margin: 0 0 10px 0; font-size: 15px;">${SVG.calendar} Entretien de bienvenue</h3>
      ${iconValue(SVG.calendar, 'Date', new Date(entretien.date).toLocaleString())}
      ${iconValue(SVG.clipboard, 'Commentaire', entretien.commentaire || 'Aucun')}
      <p style="color: #475569; font-size: 13px; margin: 8px 0 0 0;">Un entretien a été planifié pour vous accueillir dans l'association.</p>
    </div>
  `);
  return sendEmail(membre.email, subject, html);
};

// ============================================================
// 3b. ENTRETIEN DE BIENVENUE
// ============================================================

const getLieuEntretien = async () => {
  try {
    const config = await SiteConfig.findOne({ key: 'main' }).lean();
    return config?.adresse || config?.slogan || 'JCI Sidi Mansour';
  } catch {
    return 'JCI Sidi Mansour';
  }
};

const sendInterviewEmail = async (membre, entretien) => {
  const lieu = entretien.lieu || await getLieuEntretien();
  const subject = 'Entretien de bienvenue - JCI Sidi Mansour';
  const html = emailLayout('Entretien de bienvenue', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Votre inscription a été acceptée par le Président. Un entretien de bienvenue a été planifié pour vous accueillir.</p>
    <div style="${STYLES.cardGreen}">
      ${iconValue(SVG.calendar, 'Date', new Date(entretien.date).toLocaleString('fr-FR'))}
      ${iconValue(SVG.pin, 'Lieu', lieu)}
      ${iconValue(SVG.clipboard, 'Commentaire', entretien.commentaire || 'Aucun commentaire')}
    </div>
    <p style="${STYLES.paragraph}">Votre compte est en attente de validation finale après l'entretien.</p>
  `);
  return sendEmail(membre.email, subject, html);
};

// ============================================================
// 4. VALIDATION CONFIRMÉE AU PRÉSIDENT
// ============================================================

const sendValidationConfirmationToPresident = async (presidentEmail, membre, entretien) => {
  const subject = `${membre.prenom} ${membre.nom} a été validé`;
  const html = emailLayout('Validation confirmée', `
    <p style="${STYLES.paragraph}">Le membre suivant a été validé avec succès :</p>
    <div style="${STYLES.card}">
      ${iconValue(SVG.user, 'Membre', `${membre.prenom} ${membre.nom}`)}
      ${iconValue(SVG.mail, 'Email', membre.email)}
    </div>
    <p style="${STYLES.paragraph}">Un entretien a été automatiquement créé pour le ${new Date(entretien.date).toLocaleString()}.</p>
  `);
  return sendEmail(presidentEmail, subject, html);
};

// ============================================================
// 5. REJET D'INSCRIPTION
// ============================================================

const sendRejectionEmail = async (email, nom, prenom) => {
  const subject = 'Refus de votre inscription';
  const html = emailLayout('Demande rejetée', `
    <p style="${STYLES.greeting}">Bonjour <strong>${prenom} ${nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Votre demande d'inscription à JCI Sidi Mansour n'a pas été retenue.</p>
    <p style="${STYLES.paragraph}">Si vous avez des questions, vous pouvez contacter l'association.</p>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 5b. VALIDATION ACCEPTÉE (sans entretien)
// ============================================================

const sendValidationAccepteeEmail = async (membre) => {
  const subject = 'Validation de votre inscription';
  const html = emailLayout('Inscription validée', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Votre inscription à JCI Sidi Mansour a été acceptée par le Président.</p>
    <p style="${STYLES.paragraph}">Vous pouvez dès maintenant accéder à votre espace personnel et participer aux activités de l'association.</p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${getMemberLink(membre, 'dashboard')}" style="${STYLES.btn} ${STYLES.btnPrimary}">Accéder à mon espace</a>
    </div>
  `);
  return sendEmail(membre.email, subject, html);
};

// ============================================================
// 6. SUSPENSION DE COMPTE
// ============================================================

const sendSuspensionEmail = async (email, nom, prenom) => {
  const subject = 'Compte suspendu - JCI Sidi Mansour';
  const html = emailLayout('Compte suspendu', `
    <p style="${STYLES.greeting}">Bonjour <strong>${prenom} ${nom}</strong>,</p>
    <div style="${STYLES.cardYellow}">
      ${iconTag(SVG.pause, 'Votre compte a été suspendu par le Président. Pour toute question, veuillez contacter l\'association.')}
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 6b. VÉRIFICATION NOUVEL EMAIL
// ============================================================

const sendEmailChangeVerification = async (email, nom, prenom, token) => {
  const subject = 'Vérification de votre nouvel email - JCI Sidi Mansour';
  const verifyLink = `${FRONTEND_URL}/verify-email?token=${token}`;
  const html = emailLayout('Vérification email', `
    <p style="${STYLES.greeting}">Bonjour <strong>${prenom} ${nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Votre adresse email a été modifiée. Pour confirmer votre nouvelle adresse et réactiver votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${verifyLink}" style="${STYLES.btn} ${STYLES.btnPrimary}">Confirmer mon email</a>
    </div>
    <p style="${STYLES.paragraph}">Ce lien expire dans <strong>24 heures</strong>.</p>
    <div style="${STYLES.cardYellow}">
      ${iconTag(SVG.info, 'Si vous n\'êtes pas à l\'origine de cette modification, veuillez contacter immédiatement l\'association.')}
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 7. RÉACTIVATION DE COMPTE
// ============================================================

const sendReactivationEmail = async (email, nom, prenom, membreId) => {
  const subject = 'Compte réactivé - JCI Sidi Mansour';
  const html = emailLayout('Compte réactivé', `
    <p style="${STYLES.greeting}">Bonjour <strong>${prenom} ${nom}</strong>,</p>
    <div style="${STYLES.cardGreen}">
      ${iconTag(SVG.refresh, 'Votre compte a été réactivé par le Président. Vous pouvez maintenant accéder à votre espace personnel.')}
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${getMemberLink({ _id: membreId, prenom, nom }, 'dashboard')}" style="${STYLES.btn} ${STYLES.btnPrimary}">Accéder à mon espace</a>
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 8. NOUVEAU DOCUMENT
// ============================================================

const sendNewDocumentEmail = async (emails, document, user) => {
  const subject = `Nouveau document: ${document.titre}`;
  for (const email of emails) {
    let membreLink = `${FRONTEND_URL}/documents`;
    try {
      const membre = await Membre.findOne({ email }).select('_id prenom nom');
      if (membre) membreLink = getMemberLink(membre, 'dashboard');
    } catch {}
    const html = emailLayout('Nouveau document', `
      <p style="${STYLES.paragraph}">Un nouveau document a été uploadé sur la plateforme.</p>
      <div style="${STYLES.card}">
        ${iconValue(SVG.document, 'Titre', document.titre)}
        ${iconValue(SVG.tag, 'Type', document.type)}
        ${iconValue(SVG.clipboard, 'Description', document.description || 'Aucune description')}
        ${iconValue(SVG.user, 'Uploadé par', `${user.prenom} ${user.nom}`)}
        ${iconValue(SVG.calendar, 'Date', new Date().toLocaleString())}
        ${iconValue(SVG.upload, 'Fichier', document.fichierNom || 'Non spécifié')}
        ${iconValue(SVG.tag, 'Taille', document.fichierTaille ? `${(document.fichierTaille / 1024).toFixed(2)} KB` : 'Non spécifié')}
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${membreLink}" style="${STYLES.btn} ${STYLES.btnPrimary}">Voir les documents</a>
      </div>
    `);
    await sendEmail(email, subject, html);
  }
  return true;
};

// ============================================================
// 9. NOUVELLE TÂCHE ASSIGNÉE
// ============================================================

const sendTaskAssignmentEmail = async (email, membre, task) => {
  const subject = `Nouvelle tâche: ${task.titre}`;
  const html = emailLayout('Nouvelle tâche assignée', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Une nouvelle tâche vous a été assignée.</p>
    <div style="${STYLES.card}">
      ${iconValue(SVG.clipboard, 'Titre', task.titre)}
      ${iconValue(SVG.clipboard, 'Description', task.description || 'Aucune description')}
      ${iconValue(SVG.clock, 'Deadline', new Date(task.deadline).toLocaleString())}
      ${iconValue(SVG.tag, 'Priorité', task.priority || 'Moyenne')}
      ${iconValue(SVG.document, 'Type', task.type || 'Task Normale')}
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${getMemberLink(membre, 'tasks')}" style="${STYLES.btn} ${STYLES.btnPrimary}">Voir mes tâches</a>
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 10. NOUVEL ÉVÉNEMENT
// ============================================================

const sendNewEventEmail = async (email, membre, event) => {
  const subject = `Nouvel événement: ${event.titre}`;
  const html = emailLayout('Nouvel événement', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Un nouvel événement a été créé sur la plateforme.</p>
    <div style="${STYLES.card}">
      ${iconValue(SVG.calendar, 'Titre', event.titre)}
      ${iconValue(SVG.tag, 'Type', event.type)}
      ${iconValue(SVG.clipboard, 'Description', event.description || 'Aucune description')}
      ${iconValue(SVG.calendar, 'Date', new Date(event.date).toLocaleString())}
      ${iconValue(SVG.pin, 'Lieu', event.lieu)}
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${getMemberLink(membre, 'events')}" style="${STYLES.btn} ${STYLES.btnPrimary}">Voir les événements</a>
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 11. DEMANDE D'ENTRETIEN
// ============================================================

const sendEntretienRequestEmail = async (presidentEmail, membre, entretien) => {
  const subject = `Demande d'entretien: ${membre.prenom} ${membre.nom}`;
  const html = emailLayout('Demande d\'entretien', `
    <p style="${STYLES.paragraph}">Un membre a demandé un entretien.</p>
    <div style="${STYLES.card}">
      ${iconValue(SVG.user, 'Membre', `${membre.prenom} ${membre.nom}`)}
      ${iconValue(SVG.mail, 'Email', membre.email)}
      ${iconValue(SVG.calendar, 'Date demandée', new Date(entretien.date).toLocaleString())}
      ${iconValue(SVG.clipboard, 'Commentaire', entretien.commentaire || 'Aucun commentaire')}
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${FRONTEND_URL}/admin" style="${STYLES.btn} ${STYLES.btnSuccess}; margin-right: 8px;">Approuver</a>
      <a href="${FRONTEND_URL}/admin" style="${STYLES.btn} ${STYLES.btnDanger}">Rejeter</a>
    </div>
  `);
  return sendEmail(presidentEmail, subject, html);
};

// ============================================================
// 12. ENTRETIEN APPROUVÉ
// ============================================================

const sendEntretienApprovedEmail = async (email, membre, entretien) => {
  const subject = 'Demande d\'entretien approuvée - JCI Sidi Mansour';
  const html = emailLayout('Entretien approuvé', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Votre demande d'entretien a été approuvée par le Président.</p>
    <div style="${STYLES.cardGreen}">
      ${iconValue(SVG.calendar, 'Date', new Date(entretien.date).toLocaleString('fr-FR'))}
      ${iconValue(SVG.clipboard, 'Commentaire', entretien.commentaire || 'Aucun')}
    </div>
    <p style="${STYLES.paragraph}">Vous serez contacté(e) pour plus de détails.</p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${getMemberLink(membre, 'dashboard')}" style="${STYLES.btn} ${STYLES.btnPrimary}">Accéder à mon espace</a>
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 13. ENTRETIEN REJETÉ
// ============================================================

const sendEntretienRejectedEmail = async (email, membre, entretien) => {
  const subject = 'Demande d\'entretien - JCI Sidi Mansour';
  const html = emailLayout('Entretien refusé', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Votre demande d'entretien n'a pas été retenue.</p>
    <p style="${STYLES.paragraph}">Si vous avez des questions, veuillez contacter l'association.</p>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 14. NOUVELLE PUBLICATION
// ============================================================

const sendNewPublicationEmail = async (emails, publication, user) => {
  const subject = `Nouvelle publication: ${publication.titre}`;
  for (const email of emails) {
    let membreLink = `${FRONTEND_URL}/publications`;
    try {
      const membre = await Membre.findOne({ email }).select('_id prenom nom');
      if (membre) membreLink = getMemberLink(membre, 'dashboard');
    } catch {}
    const html = emailLayout('Nouvelle publication', `
      <p style="${STYLES.paragraph}">Une nouvelle publication a été créée sur la plateforme.</p>
      <div style="${STYLES.card}">
        ${iconValue(SVG.megaphone, 'Titre', publication.titre)}
        ${iconValue(SVG.clipboard, 'Légende', publication.caption || 'Aucune légende')}
        ${iconValue(SVG.tag, 'Type', publication.type)}
        ${iconValue(SVG.mail, 'Réseaux', (publication.socialMedia && Array.isArray(publication.socialMedia)) ? publication.socialMedia.join(', ') : 'Non spécifié')}
        ${iconValue(SVG.user, 'Créé par', `${user.prenom} ${user.nom}`)}
        ${iconValue(SVG.calendar, 'Date', new Date().toLocaleString())}
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${membreLink}" style="${STYLES.btn} ${STYLES.btnPrimary}">Voir les publications</a>
      </div>
    `);
    await sendEmail(email, subject, html);
  }
  return true;
};

// ============================================================
// 15. NOUVELLE ACTUALITÉ
// ============================================================

const sendNewNewsEmail = async (emails, news, user) => {
  const subject = `Nouvelle actualité: ${news.titre}`;
  for (const email of emails) {
    let membreLink = `${FRONTEND_URL}/news`;
    try {
      const membre = await Membre.findOne({ email }).select('_id prenom nom');
      if (membre) membreLink = getMemberLink(membre, 'dashboard');
    } catch {}
    const html = emailLayout('Nouvelle actualité', `
      <p style="${STYLES.paragraph}">Une nouvelle actualité a été publiée sur la plateforme.</p>
      <div style="${STYLES.card}">
        ${iconValue(SVG.newspaper, 'Titre', news.titre)}
        ${iconValue(SVG.clipboard, 'Contenu', news.contenu ? (news.contenu.substring(0, 200) + (news.contenu.length > 200 ? '...' : '')) : '' )}
        ${iconValue(SVG.user, 'Publié par', `${user.prenom} ${user.nom}`)}
        ${iconValue(SVG.calendar, 'Date', new Date().toLocaleString())}
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${membreLink}" style="${STYLES.btn} ${STYLES.btnPrimary}">Lire l'actualité</a>
      </div>
    `);
    await sendEmail(email, subject, html);
  }
  return true;
};

// ============================================================
// 16. RAPPEL DE TÂCHE MÉDIA
// ============================================================

const sendTaskReminderEmail = async (email, membre, task) => {
  const subject = `Rappel - Tâche Média: ${task.titre}`;
  const html = emailLayout('Rappel de tâche Média', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Un rappel concernant votre tâche média ci-dessous.</p>
    <div style="${STYLES.card}">
      ${iconValue(SVG.clipboard, 'Titre', task.titre)}
      ${iconValue(SVG.clipboard, 'Description', task.description || 'Aucune description')}
      ${iconValue(SVG.calendar, 'Date', new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}
      ${iconValue(SVG.clock, 'Heure', new Date(task.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}
      ${iconValue(SVG.tag, 'Priorité', task.priority || 'Moyenne')}
      ${iconValue(SVG.pin, 'Lieu', task.location || 'Non spécifié')}
    </div>
    <div style="${STYLES.cardYellow}">
      ${iconTag(SVG.warning, 'Cette tâche nécessite votre attention. Veuillez la compléter avant la date limite.')}
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${getMemberLink(membre, 'tasks')}" style="${STYLES.btn} ${STYLES.btnPrimary}; margin-right: 6px;">Voir la tâche</a>
      <a href="${getMemberLink(membre, 'calendar')}" style="${STYLES.btn} ${STYLES.btnOutline}">Calendrier</a>
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 17. RAPPEL AUTOMATIQUE - TÂCHES MÉDIA
// ============================================================

const sendAutoTaskReminderEmail = async (email, membre, task) => {
  const subject = `Rappel automatique: ${task.titre} (dans 24h)`;
  const html = emailLayout('Rappel automatique', `
    <p style="${STYLES.greeting}">Bonjour <strong>${membre.prenom} ${membre.nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Votre tâche média arrive à échéance.</p>
    <div style="${STYLES.card}">
      ${iconValue(SVG.clipboard, 'Titre', task.titre)}
    </div>
    <div style="${STYLES.cardRed}">
      ${iconValue(SVG.clock, 'Échéance', new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + new Date(task.deadline).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}
      ${iconTag(SVG.warning, 'Temps restant : Moins de 24h')}
    </div>
    <div style="${STYLES.card}">
      ${iconValue(SVG.user, 'Assigné à', `${membre.prenom} ${membre.nom}`)}
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${getMemberLink(membre, 'tasks')}" style="${STYLES.btn} ${STYLES.btnPrimary}">Voir la tâche</a>
    </div>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 18. RÉINITIALISATION DE MOT DE PASSE
// ============================================================

const sendForgotPasswordCode = async (email, prenom, nom, code) => {
  const subject = 'Réinitialisation de mot de passe - JCI Sidi Mansour';
  const html = emailLayout('Réinitialisation', `
    <p style="${STYLES.greeting}">Bonjour <strong>${prenom} ${nom}</strong>,</p>
    <p style="${STYLES.paragraph}">Vous avez demandé la réinitialisation de votre mot de passe. Utilisez le code ci-dessous :</p>
    <div style="text-align: center; margin: 24px 0;">
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #3A67B1; background: #eef2ff; padding: 16px 24px; border-radius: 8px; display: inline-block; font-family: 'Courier New', monospace;">
        ${code}
      </div>
    </div>
    <p style="${STYLES.paragraph}">Ce code expire dans <strong>15 minutes</strong>.</p>
    <p style="${STYLES.paragraph}">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
  `);
  return sendEmail(email, subject, html);
};

// ============================================================
// 19. NOTIFICATION DE CONTACT AU PRÉSIDENT
// ============================================================

const sendContactNotificationToPresident = async (presidentEmail, contact) => {
  const subject = `Nouveau message de ${contact.nom} - JCI Sidi Mansour`;
  const html = emailLayout('Nouveau message de contact', `
    <p style="${STYLES.paragraph}">Vous avez reçu un nouveau message depuis le formulaire de contact.</p>
    <div style="${STYLES.card}">
      ${iconValue(SVG.user, 'Nom', contact.nom)}
      ${iconValue(SVG.mail, 'Email', contact.email)}
      ${iconValue(SVG.calendar, 'Date', new Date(contact.createdAt).toLocaleString('fr-FR'))}
    </div>
    <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
      <h3 style="color: #3A67B1; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">${SVG.clipboard} Message :</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${contact.message}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${FRONTEND_URL}/president/contacts" style="${STYLES.btn} ${STYLES.btnPrimary}">Voir les messages</a>
    </div>
  `);
  return sendEmail(presidentEmail, subject, html);
};

// ============================================================
// EXPORTATIONS
// ============================================================

module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendNewMemberNotificationToPresident,
  sendValidationAcceptedEmail,
  sendInterviewEmail,
  sendValidationConfirmationToPresident,
  sendRejectionEmail,
  sendValidationAccepteeEmail,
  sendSuspensionEmail,
  sendEmailChangeVerification,
  sendReactivationEmail,
  sendNewDocumentEmail,
  sendTaskAssignmentEmail,
  sendNewEventEmail,
  sendEntretienRequestEmail,
  sendEntretienApprovedEmail,
  sendEntretienRejectedEmail,
  sendNewPublicationEmail,
  sendNewNewsEmail,
  sendTaskReminderEmail,
  sendAutoTaskReminderEmail,
  sendForgotPasswordCode,
  sendContactNotificationToPresident,
};

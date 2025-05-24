const fs = require('fs');
const path = require('path');

// Créer le dossier public/lib s'il n'existe pas
const libDir = path.join(__dirname, '..', 'public', 'lib');
if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
}

// Copier marked
const markedSource = path.join(__dirname, '..', 'node_modules', 'marked', 'marked.min.js');
const markedDest = path.join(libDir, 'marked.min.js');
if (fs.existsSync(markedSource)) {
    fs.copyFileSync(markedSource, markedDest);
    console.log('✓ Marked copié');
}

// Copier DOMPurify
const dompurifySource = path.join(__dirname, '..', 'node_modules', 'dompurify', 'dist', 'purify.min.js');
const dompurifyDest = path.join(libDir, 'purify.min.js');
if (fs.existsSync(dompurifySource)) {
    fs.copyFileSync(dompurifySource, dompurifyDest);
    console.log('✓ DOMPurify copié');
}

// Créer le dossier prism
const prismDir = path.join(libDir, 'prism');
if (!fs.existsSync(prismDir)) {
    fs.mkdirSync(prismDir, { recursive: true });
}

// Copier Prism core
const prismCoreSource = path.join(__dirname, '..', 'node_modules', 'prismjs', 'prism.js');
const prismCoreDest = path.join(prismDir, 'prism-core.js');
if (fs.existsSync(prismCoreSource)) {
    fs.copyFileSync(prismCoreSource, prismCoreDest);
    console.log('✓ Prism core copié');
}

// Copier les composants Prism nécessaires
const prismComponents = [
    'prism-javascript.js',
    'prism-python.js',
    'prism-json.js',
    'prism-markdown.js',
    'prism-css.js',
    'prism-markup.js',
    'prism-sql.js',
    'prism-java.js',
    'prism-c.js',
    'prism-cpp.js',
    'prism-php.js',
    'prism-ruby.js',
    'prism-go.js',
    'prism-rust.js',
    'prism-typescript.js',
    'prism-jsx.js',
    'prism-tsx.js'
];

const componentsDir = path.join(__dirname, '..', 'node_modules', 'prismjs', 'components');
prismComponents.forEach(component => {
    const source = path.join(componentsDir, component);
    const dest = path.join(prismDir, component);
    if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        console.log(`✓ ${component} copié`);
    }
});

// Copier le thème Prism
const themesDir = path.join(__dirname, '..', 'node_modules', 'prismjs', 'themes');
const themeSource = path.join(themesDir, 'prism-tomorrow.css');
const themeDest = path.join(prismDir, 'prism-tomorrow.css');
if (fs.existsSync(themeSource)) {
    fs.copyFileSync(themeSource, themeDest);
    console.log('✓ Thème Prism copié');
}

console.log('\n📦 Toutes les dépendances ont été copiées avec succès !');
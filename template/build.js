#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class WorkHourlyBuilder {
  constructor() {
    this.baseDir = path.resolve(__dirname, '..');
    this.templatePath = path.join(__dirname, 'index.template.html');
    this.translationsDir = path.join(this.baseDir, 'translations');
    this.isDev = process.argv.includes('--dev');
    
    console.log('🏗️  WorkHourly Multi-Language Builder');
    console.log(`📁 Base directory: ${this.baseDir}`);
  }

  async build() {
    try {
      // Check if template exists
      if (!fs.existsSync(this.templatePath)) {
        console.log('📄 Template not found, creating from current index.html...');
        await this.createTemplate();
      }

      const template = fs.readFileSync(this.templatePath, 'utf8');
      const languages = this.getLanguages();
      
      console.log(`🌍 Found ${languages.length} languages: ${languages.join(', ')}`);
      
      // Build each language
      let successCount = 0;
      for (const lang of languages) {
        try {
          console.log(`🔨 Building ${lang}...`);
          const translations = this.loadTranslations(lang);
          const html = this.replaceTokens(template, translations);
          this.writeFile(lang, html);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to build ${lang}:`, error.message);
        }
      }
      
      console.log(`\\n✅ Successfully built ${successCount}/${languages.length} language versions!`);
      console.log(`🚀 Your multilingual site is ready!`);
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  getLanguages() {
    if (!fs.existsSync(this.translationsDir)) {
      console.error(`❌ Translations directory not found: ${this.translationsDir}`);
      return [];
    }
    
    return fs.readdirSync(this.translationsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .sort();
  }

  loadTranslations(lang) {
    const filePath = path.join(this.translationsDir, `${lang}.json`);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load translations for ${lang}: ${error.message}`);
    }
  }

  replaceTokens(template, translations) {
    let html = template;
    
    // Replace all {{TOKEN}} placeholders
    Object.entries(translations).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    });
    
    // Check for unreplaced tokens
    const unreplacedTokens = html.match(/{{[^}]+}}/g);
    if (unreplacedTokens && !this.isDev) {
      console.warn(`⚠️  Warning: Unreplaced tokens found: ${unreplacedTokens.join(', ')}`);
    }
    
    return html;
  }

  writeFile(lang, html) {
    const isDefault = lang === 'en';
    const outputDir = isDefault ? this.baseDir : path.join(this.baseDir, lang);
    const outputFile = path.join(outputDir, 'index.html');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(outputFile, html, 'utf8');
    
    const relativePath = isDefault ? 'index.html' : `${lang}/index.html`;
    console.log(`  ✓ ${relativePath}`);
  }

  async createTemplate() {
    const currentIndexPath = path.join(this.baseDir, 'index.html');
    
    if (!fs.existsSync(currentIndexPath)) {
      throw new Error('No index.html found to create template from');
    }
    
    // For now, just copy the current index.html as template
    // We'll manually add tokens in the next step
    const currentHtml = fs.readFileSync(currentIndexPath, 'utf8');
    fs.writeFileSync(this.templatePath, currentHtml, 'utf8');
    
    console.log(`📋 Template created at: ${this.templatePath}`);
    console.log('📝 Next step: Add {{TOKEN}} placeholders to the template');
  }
}

// Run the builder
const builder = new WorkHourlyBuilder();
builder.build().catch(error => {
  console.error('💥 Build process failed:', error);
  process.exit(1);
});
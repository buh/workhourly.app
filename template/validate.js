#!/usr/bin/env node

/**
 * WorkHourly Website Validation Script
 * Validates generated HTML for common issues before deployment
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];

function error(message) {
    errors.push(`❌ ERROR: ${message}`);
}

function warning(message) {
    warnings.push(`⚠️  WARNING: ${message}`);
}

function success(message) {
    console.log(`✅ ${message}`);
}

function validateFile(filePath, language = 'en') {
    if (!fs.existsSync(filePath)) {
        error(`File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. Check for version numbers (v1.0, v1.8, etc.) - but exclude valid uses
    const versionPattern = /\b[vV](\d+\.\d+)/g;
    const versionMatches = content.match(versionPattern);
    if (versionMatches && versionMatches.length > 0) {
        error(`${language}: Found app version references: ${versionMatches.join(', ')}`);
    }

    // 2. Validate JSON-LD structured data
    const jsonLdMatch = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
        try {
            const jsonLd = JSON.parse(jsonLdMatch[1]);

            // Check for softwareVersion field (should not exist)
            if (jsonLd.softwareVersion) {
                error(`${language}: JSON-LD contains softwareVersion field`);
            }

            // Check for required fields
            if (!jsonLd.name) error(`${language}: JSON-LD missing 'name' field`);
            if (!jsonLd.description) error(`${language}: JSON-LD missing 'description' field`);
            if (!jsonLd.featureList || jsonLd.featureList.length === 0) {
                error(`${language}: JSON-LD missing or empty 'featureList'`);
            }
            if (!jsonLd.dateModified) warning(`${language}: JSON-LD missing 'dateModified' field`);

            // Check feature count
            if (jsonLd.featureList && jsonLd.featureList.length < 10) {
                warning(`${language}: JSON-LD has only ${jsonLd.featureList.length} features (expected 10+)`);
            }

            success(`${language}: JSON-LD is valid`);
        } catch (e) {
            error(`${language}: Invalid JSON-LD: ${e.message}`);
        }
    } else {
        error(`${language}: No JSON-LD structured data found`);
    }

    // 3. Check for AI vs Smart consistency in feature descriptions
    if (content.includes('AI Background Removal') || content.includes('AI-powered background removal')) {
        error(`${language}: Found "AI Background Removal" - should be "Smart Background Removal"`);
    }

    // 4. Check for unreplaced tokens
    const tokenPattern = /\{\{[A-Z_]+\}\}/g;
    const unreplacedTokens = content.match(tokenPattern);
    if (unreplacedTokens && unreplacedTokens.length > 0) {
        warning(`${language}: Found unreplaced tokens: ${unreplacedTokens.slice(0, 5).join(', ')}`);
    }

    // 5. Validate meta tags
    if (!content.includes('<meta name="description"')) {
        error(`${language}: Missing meta description`);
    }
    if (!content.includes('<meta name="keywords"')) {
        warning(`${language}: Missing meta keywords`);
    }
    if (!content.includes('og:title')) {
        warning(`${language}: Missing Open Graph tags`);
    }

    // 6. Check for placeholder images
    if (content.includes('Coming Soon')) {
        warning(`${language}: Contains placeholder content ("Coming Soon")`);
    }
}

function main() {
    console.log('🔍 Starting WorkHourly Website Validation...\n');

    // Validate English version (main)
    const rootIndex = path.join(__dirname, '..', 'index.html');
    validateFile(rootIndex, 'en');

    // Validate other languages (spot check)
    const languagesToCheck = ['es', 'fr', 'de', 'ja'];
    languagesToCheck.forEach(lang => {
        const langIndex = path.join(__dirname, '..', lang, 'index.html');
        if (fs.existsSync(langIndex)) {
            validateFile(langIndex, lang);
        }
    });

    // Print results
    console.log('\n📊 Validation Results:\n');

    if (errors.length > 0) {
        console.log('ERRORS:');
        errors.forEach(e => console.log(e));
        console.log('');
    }

    if (warnings.length > 0) {
        console.log('WARNINGS:');
        warnings.forEach(w => console.log(w));
        console.log('');
    }

    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ All validation checks passed!');
        process.exit(0);
    } else {
        console.log(`\n📈 Summary: ${errors.length} errors, ${warnings.length} warnings`);

        if (errors.length > 0) {
            console.log('\n❌ Validation failed. Please fix errors before deploying.');
            process.exit(1);
        } else {
            console.log('\n⚠️  Validation passed with warnings. Review before deploying.');
            process.exit(0);
        }
    }
}

main();

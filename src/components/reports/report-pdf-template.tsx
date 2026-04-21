'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

/**
 * Register the Kenao font for the signature 'A' logo.
 */
Font.register({
  family: 'Kenao',
  src: 'https://6000-firebase-studio-1770603697692.cluster-dcua5e7jvjesmwvkamxwtt7yac.cloudworkstations.dev/api/font',
});

const styles = StyleSheet.create({
  page: {
    padding: 60,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 20,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 40,
    height: 40,
    backgroundColor: '#FF764D',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Kenao',
    marginTop: 2,
  },
  brandName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#FF764D',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  recordType: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  // --- Hero Section ---
  studentSection: {
    marginBottom: 35,
    marginTop: 10,
  },
  studentName: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 15,
    letterSpacing: -0.5,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 30,
  },
  metaItem: {
    flexDirection: 'column',
    gap: 4,
  },
  metaLabel: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 10,
    color: '#334155',
    fontFamily: 'Helvetica-Bold',
  },
  // --- Sections ---
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    fontSize: 10,
    color: '#FF764D',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 118, 77, 0.1)',
  },
  // --- Proficiency Grid ---
  gradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gradeCard: {
    width: '48.5%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  criterionText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },
  levelBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  levelText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#FF764D',
  },
  // --- Text Containers ---
  contentBox: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  briefBox: {
    backgroundColor: 'rgba(255, 118, 77, 0.02)',
    borderColor: 'rgba(255, 118, 77, 0.08)',
  },
  narrativeBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
  },
  bodyText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: '#334155',
  },
  italicText: {
    fontStyle: 'italic',
    color: '#475569',
  },
  // --- Footer ---
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 8,
    color: '#cbd5e1',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  }
});

interface ReportPDFTemplateProps {
  studentName: string;
  assignmentTitle: string;
  date: string;
  rubricGrades: Array<{
    criterionName: string;
    score: number;
    maxScore: number;
  }>;
  teacherFeedback: string;
  aiOutput?: string;
  documentId: string;
}

const formatLevel = (score: number): string => {
  const rounded = Math.max(1, Math.min(8, Math.round(Number(score))));
  switch (rounded) {
    case 1: return 'A';
    case 2: return 'B';
    case 3: return '1';
    case 4: return '2';
    case 5: return '3';
    case 6: return '4';
    case 7: return '5';
    case 8: return '6';
    default: return '3';
  }
};

const normalize = (score: number, max: number) => (max === 6 ? score + 2 : score);

export function ReportPDFTemplate({ 
  studentName, 
  assignmentTitle,
  date, 
  rubricGrades, 
  teacherFeedback,
  aiOutput,
  documentId
}: ReportPDFTemplateProps) {
  return (
    <Document title={`Academic Report - ${studentName}`}>
      <Page size="A4" style={styles.page}>
        {/* Clean Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoGroup}>
            <View style={styles.logoMark}>
              <Text style={styles.logoLetter}>A</Text>
            </View>
            <Text style={styles.brandName}>Athena</Text>
          </View>
          <Text style={styles.recordType}>Official Academic Record</Text>
        </View>

        {/* Hero Meta Section */}
        <View style={styles.studentSection}>
          <Text style={styles.studentName}>{studentName}</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Assignment</Text>
              <Text style={styles.metaValue}>{assignmentTitle}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date Issued</Text>
              <Text style={styles.metaValue}>{date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Record ID</Text>
              <Text style={styles.metaValue}>{documentId}</Text>
            </View>
          </View>
        </View>

        {/* Proficiency Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Academic Achievement</Text>
          <View style={styles.gradesGrid}>
            {rubricGrades.map((grade, idx) => (
              <View key={idx} style={styles.gradeCard}>
                <Text style={styles.criterionText}>{grade.criterionName}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>LVL {formatLevel(normalize(grade.score, grade.maxScore))}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* AI Original Analysis */}
        {aiOutput && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>AI Intelligence Brief</Text>
            <View style={[styles.contentBox, styles.briefBox]}>
              <Text style={[styles.bodyText, styles.italicText]}>{aiOutput}</Text>
            </View>
          </View>
        )}

        {/* Teacher Commentary */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Final Teacher Narrative</Text>
          <View style={[styles.contentBox, styles.narrativeBox]}>
            <Text style={[styles.bodyText, styles.italicText]}>
              {teacherFeedback ? `"${teacherFeedback}"` : 'No additional narrative provided.'}
            </Text>
          </View>
        </View>

        {/* Professional Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This document was generated via Athena Assessment Systems and is synchronized with the student's official portal.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
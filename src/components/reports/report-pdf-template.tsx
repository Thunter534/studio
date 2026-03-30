'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register the Kenao font for use in the PDF signature logo.
// We use our dedicated API route to fetch the font binary safely.
Font.register({
  family: 'Kenao',
  src: '/api/font', 
});

const styles = StyleSheet.create({
  page: {
    padding: 60,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60,
  },
  logoMark: {
    width: 44,
    height: 44,
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
    textTransform: 'uppercase',
    marginTop: 4, // Visual alignment for the Kenao 'A'
  },
  recordType: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  studentSection: {
    marginBottom: 45,
  },
  studentName: {
    fontSize: 38,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -1,
  },
  assignmentTitle: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 25,
  },
  metaGrid: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 20,
    borderTop: 1,
    borderColor: '#f1f5f9',
    gap: 40,
  },
  metaItem: {
    flexDirection: 'column',
  },
  metaLabel: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 11,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
  },
  sectionHeader: {
    fontSize: 11,
    color: '#FF764D',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 45,
    marginBottom: 20,
  },
  gradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gradeCard: {
    width: '48.5%',
    padding: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  criterionText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  levelText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#FF764D',
  },
  narrativeContainer: {
    padding: 25,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  narrativeText: {
    fontSize: 12,
    lineHeight: 1.7,
    color: '#475569',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    textAlign: 'center',
    borderTop: 1,
    borderColor: '#f1f5f9',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 8,
    color: '#cbd5e1',
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
}

const formatProficiencyLevel = (score: number): string => {
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

const normalizeScore = (score: number, maxScore?: number): number => {
    if (maxScore === 6) return score + 2;
    return score;
};

export function ReportPDFTemplate({ 
  studentName, 
  assignmentTitle, 
  date, 
  rubricGrades, 
  teacherFeedback 
}: ReportPDFTemplateProps) {
  return (
    <Document title={`Academic Report - ${studentName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>A</Text>
          </View>
          <Text style={styles.recordType}>Academic Report</Text>
        </View>

        <View style={styles.studentSection}>
          <Text style={styles.studentName}>{studentName}</Text>
          <Text style={styles.assignmentTitle}>{assignmentTitle}</Text>
          
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date Issued</Text>
              <Text style={styles.metaValue}>{date}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Document ID</Text>
              <Text style={styles.metaValue}>OFFICIAL-RECORD</Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.sectionHeader}>Proficiency Breakdown</Text>
          <View style={styles.gradesGrid}>
            {rubricGrades.map((grade, index) => (
              <View key={index} style={styles.gradeCard}>
                <Text style={styles.criterionText}>{grade.criterionName}</Text>
                <Text style={styles.levelText}>Level {formatProficiencyLevel(normalizeScore(grade.score, grade.maxScore))}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionHeader}>Teacher Narrative</Text>
          <View style={styles.narrativeContainer}>
            <Text style={styles.narrativeText}>
              {teacherFeedback ? `"${teacherFeedback}"` : 'No additional narrative provided for this academic record.'}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated via Athena Assessment Systems • Official Student Progress Record
          </Text>
        </View>
      </Page>
    </Document>
  );
}

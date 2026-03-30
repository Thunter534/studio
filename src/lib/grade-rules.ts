export type ProficiencyLevel = 'A' | 'B' | '1' | '2' | '3' | '4' | '5' | '6';

export const ALL_PROFICIENCY_LEVELS: ProficiencyLevel[] = ['A', 'B', '1', '2', '3', '4', '5', '6'];

export const STUDENT_GRADE_OPTIONS: string[] = [
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const normalizeStudentGrade = (grade: string | null | undefined): string | null => {
  if (!grade) {
    return null;
  }

  const trimmed = grade.trim();
  if (!trimmed) {
    return null;
  }

  const lowercase = trimmed.toLowerCase();
  if (lowercase === 'k' || lowercase.includes('kindergarten')) {
    return 'Kindergarten';
  }

  const matchedNumber = lowercase.match(/\d{1,2}/);
  if (!matchedNumber) {
    return null;
  }

  const numericGrade = Number(matchedNumber[0]);
  if (!Number.isFinite(numericGrade) || numericGrade < 1 || numericGrade > 12) {
    return null;
  }

  return `Grade ${numericGrade}`;
};

export const getAllowedProficiencyLevelsForGrade = (grade: string | null | undefined): ProficiencyLevel[] => {
  const normalizedGrade = normalizeStudentGrade(grade);

  if (!normalizedGrade) {
    return ALL_PROFICIENCY_LEVELS;
  }

  if (normalizedGrade === 'Kindergarten') {
    return ['A', 'B', '1'];
  }

  const numericGrade = Number(normalizedGrade.replace('Grade ', ''));
  if (numericGrade === 1) {
    return ['A', 'B', '1', '2'];
  }
  if (numericGrade >= 2 && numericGrade <= 3) {
    return ['A', 'B', '1', '2', '3'];
  }
  if (numericGrade >= 4 && numericGrade <= 6) {
    return ['A', 'B', '1', '2', '3', '4'];
  }
  if (numericGrade >= 7 && numericGrade <= 9) {
    return ['A', 'B', '1', '2', '3', '4', '5'];
  }

  return ALL_PROFICIENCY_LEVELS;
};

export const clampProficiencyLevelForGrade = (
  level: ProficiencyLevel,
  grade: string | null | undefined,
): ProficiencyLevel => {
  const allowed = getAllowedProficiencyLevelsForGrade(grade);
  return allowed.includes(level) ? level : allowed[allowed.length - 1] ?? '6';
};

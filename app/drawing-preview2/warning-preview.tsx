'use client';

import SketchPreview from '../lab/sketch-7ca2f309e64d4b9f8a31/sketch-preview';
import { weeklyChallenges } from '@/lib/weekly';

export default function WarningPreview(){
  return <SketchPreview mission={weeklyChallenges[2]}
    notice="معاينة ثانية · رموز السيارة · بدون نشر أو قصّ الشريط"
    captionPlaceholder="كيف يوضّح رمزك المعنى؟"/>;
}

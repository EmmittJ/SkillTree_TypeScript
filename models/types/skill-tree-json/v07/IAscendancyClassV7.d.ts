interface IAscendancyClassV7 extends Omit<IAscendancyClassV1, 'displayName' | 'flavourTextRect'> {
    flavourTextRect: ISkillTreeRectV7;
    id: string;
}
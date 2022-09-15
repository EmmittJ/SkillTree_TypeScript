interface ISkillTreePreprocessor {
    CanProcess(data: ISkillTreeBase, options: ISkillTreeOptionsBase | undefined): boolean;
    Process(data: ISkillTreeBase, options: ISkillTreeOptionsBase | undefined): ISkillTreeBase;
}
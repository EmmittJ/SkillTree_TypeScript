interface ISkillTreeOptionsPreprocessor {
    CanProcess(data: ISkillTreeOptionsBase): boolean;
    Process(data: ISkillTreeOptionsBase): ISkillTreeOptionsBase;
}
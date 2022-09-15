interface ISkillTreeOptionsV2 extends ISkillTreeOptionsV1 {
    realm: string;
    circles: { [id: string]: ICircleOptionV2[] }
}

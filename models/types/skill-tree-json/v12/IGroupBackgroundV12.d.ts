type BackgroundKey =
    'PSGroupBackground1'
    | 'PSGroupBackground2'
    | 'PSGroupBackground3'
    | 'PSGroupBackground1Alt'
    | 'PSGroupBackground2Alt'
    | 'PSGroupBackground3Alt'
    | 'GroupBackgroundCleansingFire'
    | 'GroupBackgroundTangle';

interface IGroupBackgroundV12 {
    image: BackgroundKey;
    isHalfImage: boolean | undefined;
    offsetX: number | undefined;
    offsetY: number | undefined;
}
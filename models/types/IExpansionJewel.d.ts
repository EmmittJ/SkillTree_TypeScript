interface IExpansionJewel {
    /** The size of cluster jewel that the socket can fit (i.e. 2 = Large, 1 = Medium, 0 = Small) */
    size: number;

    /** Index of the jewel socket */
    index: number;

    /** The node id to the proxied node */
    proxy: string;

    /** The parent node id which was proxied from */
    parent: string | undefined;
}
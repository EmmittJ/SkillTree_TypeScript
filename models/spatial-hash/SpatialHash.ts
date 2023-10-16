export class SpatialHash {
    private _cells: (Node | null)[][];
    private _bounds: number[][];
    private _dimensions: number[];
    private _queryIds: number;

    constructor(bounds: number[][], dimensions: number[]) {
        const [x, y] = dimensions;
        this._cells = [...Array(x)].map(_ => [...Array(y)].map(_ => (null)));
        this._dimensions = dimensions;
        this._bounds = bounds;
        this._queryIds = 0;
    }

    private getCellIndex = (position: IPoint): number[] => {
        const x = this.sat((position.x - this._bounds[0][0]) / (this._bounds[1][0] - this._bounds[0][0]));
        const y = this.sat((position.y - this._bounds[0][1]) / (this._bounds[1][1] - this._bounds[0][1]));

        const xIndex = Math.floor(x * (this._dimensions[0] - 1));
        const yIndex = Math.floor(y * (this._dimensions[1] - 1));

        return [xIndex, yIndex];
    }

    public add = (id: string, position: IPoint, dimensions: { width: number, height: number }) => {
        const client: Client = {
            id: id,
            position: position,
            dimensions: dimensions,
            _cells: {
                min: null,
                max: null,
                nodes: null,
            },
            _queryId: -1,
        };

        const x = client.position.x;
        const y = client.position.y;
        const w = client.dimensions.width;
        const h = client.dimensions.height;

        const i1 = this.getCellIndex({ x: x - w / 2, y: y - h / 2 });
        const i2 = this.getCellIndex({ x: x + w / 2, y: y + h / 2 });

        const nodes = new Array<Array<Node>>();

        for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
            nodes.push([]);

            for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
                const xi = x - i1[0];

                const head: Node = {
                    next: null,
                    prev: null,
                    client: client,
                };

                nodes[xi].push(head);

                head.next = this._cells[x][y];
                if (this._cells[x][y] !== null) {
                    this._cells[x][y]!.prev = head;
                }

                this._cells[x][y] = head;
            }
        }

        client._cells.min = i1;
        client._cells.max = i2;
        client._cells.nodes = nodes;
    }

    public find = (position: IPoint, dimensions: { width: number, height: number }): string[] => {
        const x = position.x;
        const y = position.y;
        const w = dimensions.width;
        const h = dimensions.height;

        const i1 = this.getCellIndex({ x: x - w / 2, y: y - h / 2 });
        const i2 = this.getCellIndex({ x: x + w / 2, y: y + h / 2 });

        const clients = new Array<string>();
        const queryId = this._queryIds++;

        for (let x = i1[0], xn = i2[0]; x <= xn; ++x) {
            for (let y = i1[1], yn = i2[1]; y <= yn; ++y) {
                let head = this._cells[x][y];

                while (head) {
                    const v = head.client;
                    head = head.next;

                    if (v._queryId != queryId) {
                        v._queryId = queryId;
                        clients.push(v.id);
                    }
                }
            }
        }
        return clients;
    }

    private sat = (x: number): number => {
        return Math.min(Math.max(x, 0.0), 1.0);
    }
}

type Client = {
    id: string;
    position: IPoint;
    dimensions: {
        width: number;
        height: number;
    };
    _cells: {
        min: number[] | null;
        max: number[] | null;
        nodes: Node[][] | null;
    };
    _queryId: number;
}

type Node = {
    next: Node | null;
    prev: Node | null;
    client: Client;
}
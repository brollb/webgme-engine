function SHA1() {

    this.pp = function (b, a) {
        return b << a | b >>> 32 - a
    };

    this.oo = function (l, a, k, b, c) {
        try{
            return l.charCodeAt(a * 64 + k * 4 + b) << c
        } catch(e){}
    };

    this.getHash = function(l) {

        l += "";
        for (var n = Math, c = [1518500249, 1859775393, 2400959708, 3395469782, 1732584193, 4023233417, 2562383102, 271733878, 3285377520, 4294967295], s = n.ceil(l.length / 4) + 2, q = n.ceil(s / 16), g = [], a = 0, h = [], j, d, e, f, m, i, b, k; a < q; a++) {
            g[a] = [];
            for (k = 0; k < 16; k++) {
                g[a][k] = this.oo(l, a, k, 0, 24) | this.oo(l, a, k, 1, 16) | this.oo(l, a, k, 2, 8) | this.oo(l, a, k, 3, 0)
            }
        }
        i = l.length * 8 - 8;
        a = q - 1;
        g[a][14] = i / (c[9] + 1);
        g[a][14] = n.floor(g[a][14]);
        g[a][15] = i & c[9];
        for (a = 0; a < q; a++) {
            for (b = 0; b < 16; b++)h[b] = g[a][b];
            for (b = 16; b < 80; b++)h[b] = this.pp(h[b - 3] ^ h[b - 8] ^ h[b - 14] ^ h[b - 16], 1);
            j = c[4];
            d = c[5];
            e = c[6];
            f = c[7];
            m = c[8];
            for (b = 0; b < 80; b++) {
                var r = n.floor(b / 20), t = this.pp(j, 5) + (r < 1 ? d & e ^ ~d & f : r == 2 ? d & e ^ d & f ^ e & f : d ^ e ^ f) + m + c[r] + h[b] & c[9];
                m = f;
                f = e;
                e = this.pp(d, 30);
                d = j;
                j = t
            }
            c[4] += j;
            c[5] += d;
            c[6] += e;
            c[7] += f;
            c[8] += m
        }
        i = "";
        for (z = 4; z < 9; z++)
            for (a = 7; a >= 0; a--)
                i += ((c[z] & c[9]) >>> a * 4 & 15).toString(16);
        return i
    };
}

function xorHashes(a,b){
    var outHash = "";
    if(a.length === b.length){
        for(var i=0;i< a.length;i++){
            outHash += (parseInt(a.charAt(i),16) ^ parseInt(b.charAt(i),16)).toString(16);
        }
    }
    return outHash;
}
var zeroHash = "0000000000000000000000000000000000000000";
var sha = new SHA1();
function calculateHash(id,datas){
    var hash = zeroHash,
        i;

    for(i=0;i<datas.length;i++){
        hash = xorHashes(hash,sha.getHash(datas[i]));
    }

    postMessage({id:id,hash:hash});

}

onmessage = function(event){
    calculateHash(event.data.id,event.data.datas);
};
